import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orderId } = await context.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        fulfillmentStatus: true,
        total: true,
        reservationExpiresAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    let status = order.status;
    if (
      status === "PENDING" &&
      order.reservationExpiresAt &&
      order.reservationExpiresAt <= new Date()
    ) {
      const expired = await prisma.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",
          reservationExpiresAt: { lte: new Date() },
        },
        data: { status: "CANCELLED" },
      });

      if (expired.count > 0) {
        status = "CANCELLED";
      } else {
        const latest = await prisma.order.findUnique({
          where: { id: order.id },
          select: { status: true },
        });
        status = latest?.status ?? status;
      }
    }

    return NextResponse.json(
      {
        order: {
          id: order.id,
          status,
          fulfillmentStatus: order.fulfillmentStatus,
          total: order.total.toString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error al consultar estado del pedido:", error);
    return NextResponse.json(
      { error: "No se pudo consultar el estado del pedido" },
      { status: 500 },
    );
  }
}
