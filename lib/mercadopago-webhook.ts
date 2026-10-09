import {
  WebhookSignatureValidator,
} from "mercadopago";

function getWebhookSecret(): string {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("MERCADOPAGO_WEBHOOK_SECRET no está definida");
  }

  return secret;
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
