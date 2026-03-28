import { MercadoPagoConfig } from "mercadopago";

export const mp = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});
