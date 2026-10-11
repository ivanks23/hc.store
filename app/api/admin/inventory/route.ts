import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getVariantStocks } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { inventoryMovementSchema } from "@/lib/validations/admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const variants = await prisma.productVariant.findMany({
      select: {
        id: true,
        sku: true,
        price: true,
        product: { select: { name: true } },
        attributes: {
          select: {
            value: true,
            attribute: { select: { name: true } },
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { sku: "asc" }],
    });
    const variantIds = variants.map((variant) => variant.id);
    const [availableStocks, movementGroups, movements] = await Promise.all([
      getVariantStocks(variantIds),
      prisma.inventoryMovement.groupBy({
        by: ["variantId"],
        where: { variantId: { in: variantIds } },
        _sum: { quantity: true },
      }),
      prisma.inventoryMovement.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          quantity: true,
          reason: true,
          createdAt: true,
          variant: {
            select: {
              sku: true,
              product: { select: { name: true } },
            },
          },
        },
      }),
    ]);
    const physicalStocks = new Map(
      movementGroups.map((group) => [group.variantId, group._sum.quantity ?? 0]),
    );

    return NextResponse.json({
      variants: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        price: variant.price.toString(),
        productName: variant.product.name,
        attributes: variant.attributes.map(
          (attribute) => `${attribute.attribute.name}: ${attribute.value}`,
        ),
        physicalStock: physicalStocks.get(variant.id) ?? 0,
        availableStock: availableStocks.get(variant.id) ?? 0,
      })),
      movements: movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        createdAt: movement.createdAt,
        sku: movement.variant.sku,
        productName: movement.variant.product.name,
      })),
    });
  } catch (error) {
    console.error("Error al consultar inventario para administración:", error);
    return NextResponse.json(
      { error: "No se pudo consultar el inventario" },
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
    const result = inventoryMovementSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Datos de inventario inválidos" },
        { status: 400 },
      );
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: result.data.variantId },
      select: { id: true },
    });
    if (!variant) {
      return NextResponse.json({ error: "Variante no encontrada" }, { status: 404 });
    }

    const availableStock = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM "ProductVariant"
        WHERE id = ${variant.id}
        FOR UPDATE
      `;

      const currentStock = await tx.inventoryMovement.aggregate({
        where: { variantId: variant.id },
        _sum: { quantity: true },
      });
      const physicalStock = currentStock._sum.quantity ?? 0;

      if (physicalStock + result.data.quantity < 0) {
        throw new Error("No puedes retirar más unidades de las existencias físicas.");
      }

      await tx.inventoryMovement.create({ data: result.data });
      const stocks = await getVariantStocks([variant.id], tx);
      return stocks.get(variant.id) ?? 0;
    });

    return NextResponse.json({
      received: true,
      availableStock,
    });
  } catch (error) {
    console.error("Error al registrar movimiento de inventario:", error);
    if (
      error instanceof Error &&
      error.message === "No puedes retirar más unidades de las existencias físicas."
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "No se pudo registrar el movimiento de inventario" },
      { status: 500 },
    );
  }
}
