import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { mp } from "@/lib/mercadopago";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://voxshellai.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { orderId, nome, telefone, opcao, valor, payerEmail } = await req.json();

    if (!orderId || !nome || !valor) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const payment = new Payment(mp);

    const descricao =
      opcao === "tecnico"
        ? "HydroBlu Válvula + Instalação por Técnico"
        : "HydroBlu Válvula Economizadora de Água";

    const result = await payment.create({
      body: {
        transaction_amount: Number(valor),
        description: descricao,
        payment_method_id: "pix",
        payer: {
          email: payerEmail || "cliente@valvula.com",
          first_name: nome.split(" ")[0],
          last_name: nome.split(" ").slice(1).join(" ") || nome,
          phone: { number: telefone.replace(/\D/g, "") },
        },
        external_reference: `valvula|${orderId}|${telefone.replace(/\D/g, "")}`,
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
      },
    });

    return NextResponse.json({
      paymentId: result.id,
      status: result.status,
      pixQr: result.point_of_interaction?.transaction_data?.qr_code ?? null,
      pixQrBase64: result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
    });
  } catch (err) {
    console.error("[ValvulaCheckout]", err);
    return NextResponse.json({ error: "Erro ao gerar PIX" }, { status: 500 });
  }
}
