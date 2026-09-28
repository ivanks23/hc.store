import { NextResponse } from "next/server";
import { Preference } from "mercadopago";

import { mercadoPago } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { orderId } = await context.params;

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          error: "Pedido no encontrado",
        },
        { status: 404 },
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "El pedido no está disponible para pago",
        },
        { status: 409 },
      );
    }

    if (order.items.length === 0) {
      return NextResponse.json(
        {
          error: "El pedido no tiene productos",
        },
        { status: 400 },
      );
    }

    const preference = new Preference(mercadoPago);

    const response = await preference.create({
        body: {
        items: order.items.map((item) => ({
            id: item.variantId,
            title: item.productName,
            quantity: item.quantity,
            unit_price: Number(item.unitPrice),
            currency_id: "MXN",
        })),

        external_reference: order.id,

        back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/pending`,
        },

        },
    });

    return NextResponse.json({
      initPoint: response.init_point,
    });
  } catch (error) {
    console.error("Error al crear preferencia de Mercado Pago:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear el pago",
      },
      { status: 500 },
    );
  }
}