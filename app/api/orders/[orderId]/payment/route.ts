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

    const now = new Date();
    if (!order.reservationExpiresAt) {
      return NextResponse.json(
        { error: "Este pedido no tiene una reserva de stock. Crea uno nuevo para pagar." },
        { status: 409 },
      );
    }

    if (order.reservationExpiresAt <= now) {
      await prisma.order.updateMany({
        where: { id: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json(
        { error: "La reserva venció. Crea un pedido nuevo para pagar." },
        { status: 409 },
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
        payer: { email: order.customerEmail },
        external_reference: order.id,
        expires: true,
        expiration_date_from: now.toISOString(),
        expiration_date_to: order.reservationExpiresAt.toISOString(),

        notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,

        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?orderId=${order.id}`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/failure?orderId=${order.id}`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/pending?orderId=${order.id}`,
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
