import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { registerOrderItemSale } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { resolveReviewOrderSchema } from "@/lib/validations/admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "PAID",
        fulfillmentStatus: "REVIEW_REQUIRED",
      },
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            productName: true,
            sku: true,
            quantity: true,
            variantId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        total: order.total.toString(),
      })),
    });
  } catch (error) {
    console.error("Error al consultar pedidos en revisión:", error);
    return NextResponse.json(
      { error: "No se pudieron consultar los pedidos en revisión" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const result = resolveReviewOrderSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: result.data.orderId,
          status: "PAID",
          fulfillmentStatus: "REVIEW_REQUIRED",
        },
        include: { items: true },
      });

      if (!order) {
        throw new Error("El pedido ya no requiere revisión");
      }

      const variantIds = [...new Set(order.items.map((item) => item.variantId))].sort();
      for (const variantId of variantIds) {
        await tx.$queryRaw`
          SELECT "id"
          FROM "ProductVariant"
          WHERE "id" = ${variantId}
          FOR UPDATE
        `;
      }

      for (const item of order.items) {
        await registerOrderItemSale(item.id, tx);
      }

      await tx.order.update({
        where: { id: order.id },
        data: { fulfillmentStatus: "NOT_REQUIRED" },
      });
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error al resolver pedido en revisión:", error);
    const message = error instanceof Error ? error.message : "No se pudo resolver el pedido";
    const status = message.includes("Stock insuficiente") ? 409 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
