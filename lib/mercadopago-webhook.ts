import {
  WebhookSignatureValidator,
} from "mercadopago";

const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

function getWebhookSecret(): string {
  if (!webhookSecret) {
    throw new Error("MERCADOPAGO_WEBHOOK_SECRET no está definida");
  }

  return webhookSecret;
}

type ValidateWebhookSignatureParams = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
};

export function validateMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: ValidateWebhookSignatureParams) {
  WebhookSignatureValidator.validate({
    xSignature,
    xRequestId,
    dataId,
    secret: getWebhookSecret(),
    toleranceSeconds: 300,
  });
}