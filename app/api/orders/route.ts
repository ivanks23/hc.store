import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getStockReservationExpiry, getVariantStocks } from "@/lib/inventory";
import { orderSchema } from "@/lib/validations/order";

class InsufficientStockError extends Error {
  constructor(
    readonly variantId: string,
    readonly available: number,
    readonly requested: number,
  ) {
    super(`Stock insuficiente para la variante ${variantId}`);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const result = orderSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = result.data;
    const variantIds = data.items.map((item) => item.variantId);

    if (new Set(variantIds).size !== variantIds.length) {
      return NextResponse.json(
        {
          error: "No repitas una variante en el pedido",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const reservationExpiresAt = getStockReservationExpiry(now);
    const order = await prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      });

      if (variants.length !== variantIds.length) {
        return null;
      }

      for (const variantId of [...variantIds].sort()) {
        await tx.$queryRaw`
          SELECT "id"
          FROM "ProductVariant"
          WHERE "id" = ${variantId}
          FOR UPDATE
        `;
      }

      const orderItems = data.items.map((item) => {
        const variant = variants.find((current) => current.id === item.variantId)!;

        return {
          variantId: variant.id,
          productName: variant.product.name,
          sku: variant.sku,
          unitPrice: variant.price,
          quantity: item.quantity,
        };
      });

      const availableStocks = await getVariantStocks(variantIds, tx, now);
      for (const item of orderItems) {
        const available = availableStocks.get(item.variantId) ?? 0;
        if (available < item.quantity) {
          throw new InsufficientStockError(
            item.variantId,
            available,
            item.quantity,
          );
        }
      }

      const total = orderItems.reduce(
        (sum, item) => sum + Number(item.unitPrice) * item.quantity,
        0,
      );

      return tx.order.create({
        data: {
          userId: session?.user?.id ?? null,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          shippingStreet: data.shippingAddress.street,
          shippingExteriorNumber: data.shippingAddress.exteriorNumber,
          shippingInteriorNumber: data.shippingAddress.interiorNumber || null,
          shippingNeighborhood: data.shippingAddress.neighborhood,
          shippingMunicipality: data.shippingAddress.municipality,
          shippingState: data.shippingAddress.state,
          shippingPostalCode: data.shippingAddress.postalCode,
          shippingReferences: data.shippingAddress.references || null,
          wantsInvoice: data.wantsInvoice,
          billingBusinessName: data.wantsInvoice
            ? data.billingBusinessName || null
            : null,
          billingRfc: data.wantsInvoice ? data.billingRfc || null : null,
          billingRegime: data.wantsInvoice
            ? data.billingRegime || null
            : null,
          billingCfdiUse: data.wantsInvoice
            ? data.billingCfdiUse || null
            : null,
          billingStreet: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.street
              : data.billingAddress?.street || null
            : null,
          billingExteriorNumber: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.exteriorNumber
              : data.billingAddress?.exteriorNumber || null
            : null,
          billingInteriorNumber: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.interiorNumber || null
              : data.billingAddress?.interiorNumber || null
            : null,
          billingNeighborhood: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.neighborhood
              : data.billingAddress?.neighborhood || null
            : null,
          billingMunicipality: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.municipality
              : data.billingAddress?.municipality || null
            : null,
          billingState: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.state
              : data.billingAddress?.state || null
            : null,
          billingPostalCode: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.postalCode
              : data.billingAddress?.postalCode || null
            : null,
          billingReferences: data.wantsInvoice
            ? data.billingSameAsShipping
              ? data.shippingAddress.references || null
              : data.billingAddress?.references || null
            : null,
          total,
          reservationExpiresAt,
          items: { create: orderItems },
        },
        include: { items: true },
      });
    });

    if (!order) {
      return NextResponse.json(
        { error: "Una o más variantes no existen" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status: order.status,
          total: order.total.toString(),
          reservationExpiresAt: order.reservationExpiresAt,
          items: order.items,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        {
          error: "No hay existencias suficientes para completar el pedido",
          variantId: error.variantId,
          available: error.available,
          requested: error.requested,
        },
        { status: 409 },
      );
    }

    console.error("Error al crear pedido:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear el pedido",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      );
    }

    const now = new Date();
    await prisma.order.updateMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
        reservationExpiresAt: { lte: now },
      },
      data: { status: "CANCELLED" },
    });

    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            productName: true,
            quantity: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      orders,
    });
  } catch (error) {
    console.error("Error al consultar pedidos:", error);

    return NextResponse.json(
      { error: "No se pudieron consultar los pedidos" },
      { status: 500 },
    );
  }
}
