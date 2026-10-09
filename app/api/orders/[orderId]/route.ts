import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      );
    }

    const { orderId } = await context.params;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        reservationExpiresAt: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,

        shippingStreet: true,
        shippingExteriorNumber: true,
        shippingInteriorNumber: true,
        shippingNeighborhood: true,
        shippingMunicipality: true,
        shippingState: true,
        shippingPostalCode: true,
        shippingReferences: true,

        wantsInvoice: true,
        billingBusinessName: true,
        billingRfc: true,
        billingRegime: true,
        billingCfdiUse: true,
        billingStreet: true,
        billingExteriorNumber: true,
        billingInteriorNumber: true,
        billingNeighborhood: true,
        billingMunicipality: true,
        billingState: true,
        billingPostalCode: true,
        billingReferences: true,

        items: {
          select: {
            productName: true,
            sku: true,
            unitPrice: true,
            quantity: true,
          },
        },
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
          userId: session.user.id,
          status: "PENDING",
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

    return NextResponse.json({
      order: { ...order, status },
    });
  } catch (error) {
    console.error("Error al consultar pedido:", error);

    return NextResponse.json(
      { error: "No se pudo consultar el pedido" },
      { status: 500 },
    );
  }
}
