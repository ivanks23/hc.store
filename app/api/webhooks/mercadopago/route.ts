import { NextResponse } from "next/server";
import { Payment } from "mercadopago";

import { mercadoPago } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercadopago-webhook";
import { registerOrderItemSale } from "@/lib/inventory";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const dataId =
      body?.data?.id !== undefined ? String(body.data.id) : null;

    validateMercadoPagoWebhookSignature({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
    });

    if (!dataId) {
      return NextResponse.json(
        { error: "El webhook no contiene data.id" },
        { status: 400 },
      );
    }

    const paymentClient = new Payment(mercadoPago);

    const payment = await paymentClient.get({
      id: dataId,
    });

    if (!payment.external_reference) {
      return NextResponse.json(
        { error: "El pago no tiene external_reference" },
        { status: 400 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: payment.external_reference },
      include: {
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido asociado no encontrado" },
        { status: 404 },
      );
    }

    const paymentPayload = JSON.parse(JSON.stringify(payment));

    const paymentRecord = await prisma.payment.upsert({
      where: {
        mercadoPagoId: String(payment.id),
      },
      update: {
        status: payment.status ?? "unknown",
        transactionAmount: payment.transaction_amount ?? null,
        paymentType: payment.payment_type_id ?? null,
        rawPayload: paymentPayload,
      },
      create: {
        orderId: order.id,
        mercadoPagoId: String(payment.id),
        status: payment.status ?? "unknown",
        transactionAmount: payment.transaction_amount ?? null,
        paymentType: payment.payment_type_id ?? null,
        rawPayload: paymentPayload,
      },
    });

    if (payment.status === "approved" && order.status !== "PAID") {
      for (const orderItem of order.items) {
        await registerOrderItemSale(orderItem.id);
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });
    }

    console.log("Pago registrado:", {
    paymentId: paymentRecord.mercadoPagoId,
    paymentStatus: paymentRecord.status,
    orderId: order.id,
    });

    return NextResponse.json(
      {
        received: true,
        paymentId: payment.id,
        orderId: order.id,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al procesar webhook de Mercado Pago:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el webhook" },
      { status: 500 },
    );
  }
}