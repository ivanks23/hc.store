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
        customerName: true,
        customerEmail: true,
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

    return NextResponse.json({
      order,
    });
  } catch (error) {
    console.error("Error al consultar pedido:", error);

    return NextResponse.json(
      { error: "No se pudo consultar el pedido" },
      { status: 500 },
    );
  }
}