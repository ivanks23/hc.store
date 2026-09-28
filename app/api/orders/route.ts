import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validations/order";

export async function POST(request: Request) {
  try {
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

    const variants = await prisma.productVariant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      include: {
        product: true,
      },
    });

    if (variants.length !== variantIds.length) {
      return NextResponse.json(
        {
          error: "Una o más variantes no existen",
        },
        { status: 404 },
      );
    }

    const orderItems = data.items.map((item) => {
      const variant = variants.find(
        (currentVariant) => currentVariant.id === item.variantId,
      );

      if (!variant) {
        throw new Error("Variante no encontrada");
      }

      return {
        variantId: variant.id,
        productName: variant.product.name,
        sku: variant.sku,
        unitPrice: variant.price,
        quantity: item.quantity,
      };
    });

    const total = orderItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0,
    );

    const order = await prisma.order.create({
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,

        shippingStreet: data.shippingAddress.street,
        shippingExteriorNumber: data.shippingAddress.exteriorNumber,
        shippingInteriorNumber:
          data.shippingAddress.interiorNumber || null,
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

        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status: order.status,
          total: order.total.toString(),
          items: order.items,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error al crear pedido:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear el pedido",
      },
      { status: 500 },
    );
  }
}