import { NextResponse } from "next/server";
import { InvalidWebhookSignatureError, Payment } from "mercadopago";

import { mercadoPago } from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercadopago-webhook";
import { registerOrderItemSale } from "@/lib/inventory";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const rawBody = await request.text();
    let body: { type?: string; data?: { id?: string | number } } | null = null;

    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        // Legacy IPN notifications can be identified from their query string.
      }
    }

    const queryDataId = url.searchParams.get("data.id");
    const bodyDataId =
      body?.data?.id !== undefined ? String(body.data.id) : null;
    const topic =
      url.searchParams.get("type") ??
      url.searchParams.get("topic") ??
      body?.type;

    if (topic && topic !== "payment") {
      return NextResponse.json({ received: true, ignored: true });
    }

    // IPN uses ?id=...&topic=payment. Mercado Pago's IPN signature is not
    // verifiable with the Webhooks secret; authenticate the payment by
    // retrieving it from the API with our private Access Token below.
    const isLegacyIpn =
      !queryDataId &&
      !bodyDataId &&
      url.searchParams.has("id") &&
      url.searchParams.has("topic");

    const dataId =
      queryDataId ??
      bodyDataId ??
      (isLegacyIpn ? url.searchParams.get("id") : null);

    if (!isLegacyIpn) {
      validateMercadoPagoWebhookSignature({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"),
        dataId,
      });
    }

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

    const paymentRecord = await prisma.$transaction(async (tx) => {
      const paymentRecord = await tx.payment.upsert({
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
          await registerOrderItemSale(orderItem.id, tx, {
            allowInsufficientStock: true,
          });
        }

        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            status: "PAID",
          },
        });
      }

      return paymentRecord;
    });

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
    if (error instanceof InvalidWebhookSignatureError) {
      console.warn("Firma de webhook de Mercado Pago inválida:", error.reason);
      return NextResponse.json(
        { error: "Firma de webhook inválida" },
        { status: 401 },
      );
    }

    console.error("Error al procesar webhook de Mercado Pago:", error);

    return NextResponse.json(
      { error: "No se pudo procesar el webhook" },
      { status: 500 },
    );
  }
}
