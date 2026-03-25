import { NextRequest, NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { mp } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

const APP_URL = "https://kadosh-ai.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { phone, slug } = await req.json();

    const plan = PLANS[slug];
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 });

    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400 });
    }

    // Busca ou cria cliente pelo telefone
    let client = await prisma.client.findUnique({ where: { phone: cleanPhone } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          phone: cleanPhone,
          name: `Cliente ${cleanPhone}`,
          status: "inactive",
        },
      });
    }

    // Cria preferência no Mercado Pago (pagamento único)
    const preference = new Preference(mp);
    const response = await preference.create({
      body: {
        items: [
          {
            id: slug,
            title: plan.stripeName,
            quantity: 1,
            unit_price: plan.priceAmount / 100, // MP usa reais, não centavos
            currency_id: "BRL",
          },
        ],
        external_reference: `${client.id}|${slug}`,
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
        back_urls: {
          success: `${APP_URL}/login?payment=success`,
          failure: `${APP_URL}/assinar/${slug}`,
          pending: `${APP_URL}/login?payment=pending`,
        },
        auto_return: "approved",
      },
    });

    return NextResponse.json({ url: response.init_point });
  } catch (err) {
    console.error("[AssinarCheckout]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
