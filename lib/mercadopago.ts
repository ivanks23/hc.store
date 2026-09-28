import MercadoPago from "mercadopago";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("MERCADOPAGO_ACCESS_TOKEN no está definida");
}

export const mercadoPago = new MercadoPago({
  accessToken,
});