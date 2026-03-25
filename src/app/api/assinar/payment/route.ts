import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { mp } from "@/lib/mercadopago";
import { PLANS } from "@/lib/plans";

const APP_URL = "https://kadosh-ai.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { formData, clientId, slug } = await req.json();

    const plan = PLANS[slug];
    if (!plan || !clientId) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const payment = new Payment(mp);
    const result = await payment.create({
      body: {
        ...formData,
        transaction_amount: plan.priceAmount / 100,
        description: plan.stripeName,
        external_reference: `${clientId}|${slug}`,
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
      },
    });

    return NextResponse.json({
      status: result.status,
      paymentId: result.id,
      pixQr: result.point_of_interaction?.transaction_data?.qr_code ?? null,
      pixQrBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    });
  } catch (err) {
    console.error("[AssinarPayment]", err);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
