export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const existing = await prisma.client.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    // Cria cliente no Stripe primeiro
    const stripeCustomer = await stripe.customers.create({ email, name });

    // Cria usuário no banco (ainda inativo)
    const client = await prisma.client.create({
      data: {
        name,
        email,
        password: hashed,
        stripeCustomerId: stripeCustomer.id,
        status: "inactive",
      },
    });

    // Cria sessão de checkout no Stripe
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: 9700, // R$97,00
            recurring: { interval: "month" },
            product_data: {
              name: "JOW — Assistente de IA Pessoal",
              description: "Voz, memória, agentes de IA e busca web em tempo real",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${APP_URL}/login?payment=success`,
      cancel_url: `${APP_URL}/?payment=cancelled`,
      metadata: { clientId: client.id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("[Register]", err);
    return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
  }
}
