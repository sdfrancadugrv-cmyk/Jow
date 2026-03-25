import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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
      const stripeCustomer = await stripe.customers.create({
        phone: `+${cleanPhone}`,
        name: `Cliente ${cleanPhone}`,
      });
      client = await prisma.client.create({
        data: {
          phone: cleanPhone,
          name: `Cliente ${cleanPhone}`,
          status: "inactive",
          stripeCustomerId: stripeCustomer.id,
        },
      });
    } else if (!client.stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        phone: `+${cleanPhone}`,
        name: client.name,
      });
      await prisma.client.update({
        where: { id: client.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });
      client = { ...client, stripeCustomerId: stripeCustomer.id };
    }

    const session = await stripe.checkout.sessions.create({
      customer: client.stripeCustomerId!,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: plan.stripeName,
              description: plan.features.join(" · "),
            },
            unit_amount: plan.priceAmount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        clientId: client.id,
        plan: slug,
        type: "client_plan",
      },
      success_url: `${APP_URL}/login?payment=success`,
      cancel_url: `${APP_URL}/assinar/${slug}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[AssinarCheckout]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
