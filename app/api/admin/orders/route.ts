import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { updateDeliveryStatusSchema } from "@/lib/validations/admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const orders = await prisma.order.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        deliveryStatus: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        shippingStreet: true,
        shippingExteriorNumber: true,
        shippingInteriorNumber: true,
        shippingNeighborhood: true,
        shippingMunicipality: true,
        shippingState: true,
        shippingPostalCode: true,
        total: true,
        createdAt: true,
        items: {
          select: { productName: true, sku: true, quantity: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { mercadoPagoId: true, status: true, paymentType: true },
        },
      },
    });

    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        total: order.total.toString(),
      })),
    });
  } catch (error) {
    console.error("Error al consultar pedidos para administración:", error);
    return NextResponse.json({ error: "No se pudieron consultar los pedidos" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const result = updateDeliveryStatusSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: "Datos de entrega inválidos" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: result.data.orderId },
      select: { id: true, status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }
    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Solo se puede actualizar la entrega de pedidos pagados" },
        { status: 409 },
      );
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { deliveryStatus: result.data.deliveryStatus },
      select: { id: true, deliveryStatus: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error al actualizar entrega del pedido:", error);
    return NextResponse.json({ error: "No se pudo actualizar la entrega" }, { status: 500 });
  }
}
