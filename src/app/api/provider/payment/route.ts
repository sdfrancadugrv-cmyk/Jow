import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { mp } from "@/lib/mercadopago";
import { getAuthProvider } from "@/lib/provider-auth";
import prisma from "@/lib/prisma";
import { getProviderPrice } from "@/lib/service-types";

const APP_URL = "https://jennifer-ai.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthProvider();
    if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const provider = await prisma.serviceProvider.findUnique({ where: { id: auth.sub } });
    if (!provider) return NextResponse.json({ error: "Prestador não encontrado" }, { status: 404 });

    const { method, formData } = await req.json();

    const priceAmount = getProviderPrice(provider.serviceType || "");
    const payerEmail = provider.email || `${(provider.phone || "").replace(/\D/g, "")}@prestadores.jennifer.app`;
    const payment = new Payment(mp);

    // ── PIX ──────────────────────────────────────────────────────────
    if (method === "pix") {
      const result = await payment.create({
        body: {
          transaction_amount: priceAmount / 100,
          description: "Jennifer Prestador — 30 dias",
          payment_method_id: "pix",
          payer: { email: payerEmail },
          external_reference: `provider|${provider.id}`,
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

    // ── Cartão (via MP Brick formData) ───────────────────────────────
    const result = await payment.create({
      body: {
        ...formData,
        transaction_amount: priceAmount / 100,
        description: "Kadosh Prestador — 30 dias",
        external_reference: `provider|${provider.id}`,
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
      },
    });

    return NextResponse.json({
      paymentId: result.id,
      status: result.status,
    });
  } catch (err) {
    console.error("[ProviderPayment]", err);
    return NextResponse.json({ error: "Erro ao processar pagamento" }, { status: 500 });
  }
}
