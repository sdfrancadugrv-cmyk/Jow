import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { mp } from "@/lib/mercadopago";

const APP_URL = "https://kadosh-ai.vercel.app";
const PRICE = 9.90;

export async function POST(req: NextRequest) {
  try {
    const { method, payerEmail, formData, providerId, clientName, clientPhone } = await req.json();

    if (!providerId || !clientName || !clientPhone) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const payment = new Payment(mp);
    const externalRef = `hire|${providerId}|${clientPhone}|${encodeURIComponent(clientName)}`;

    // ── PIX ──────────────────────────────────────────────────────────
    if (method === "pix") {
      if (!payerEmail) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });

      const result = await payment.create({
        body: {
          transaction_amount: PRICE,
          description: "Kadosh — Contato com profissional",
          payment_method_id: "pix",
          payer: { email: payerEmail },
          external_reference: externalRef,
          notification_url: `${APP_URL}/api/mercadopago/webhook`,
        },
      });

      return NextResponse.json({
        paymentId: result.id,
        status: result.status,
        pixQr: result.point_of_interaction?.transaction_data?.qr_code ?? null,
        pixQrBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      });
    }

    // ── Cartão ────────────────────────────────────────────────────────
    const result = await payment.create({
      body: {
        ...formData,
        transaction_amount: PRICE,
        description: "Kadosh — Contato com profissional",
        external_reference: externalRef,
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
      },
    });

    return NextResponse.json({ paymentId: result.id, status: result.status });
  } catch (err) {
    console.error("[ServiceHire]", err);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
