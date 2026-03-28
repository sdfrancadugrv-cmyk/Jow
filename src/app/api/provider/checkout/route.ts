import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthProvider } from "@/lib/provider-auth";
import prisma from "@/lib/prisma";

const APP_URL = "https://JENNIFER-ai.vercel.app";

export async function POST() {
  const auth = await getAuthProvider();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const provider = await prisma.serviceProvider.findUnique({ where: { id: auth.sub } });
  if (!provider) return NextResponse.json({ error: "Prestador não encontrado" }, { status: 404 });

  if (provider.status === "active" && provider.expiresAt && provider.expiresAt > new Date()) {
    return NextResponse.json({ url: `${APP_URL}/provider/dashboard` });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: provider.email || undefined,
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: "JENNIFER Prestador — 30 dias",
            description: "Receba pedidos de clientes próximos a você via WhatsApp por 30 dias.",
          },
          unit_amount: 2990,
        },
        quantity: 1,
      },
    ],
    phone_number_collection: { enabled: false },
    metadata: { providerId: provider.id },
    success_url: `${APP_URL}/provider/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/provider/subscribe`,
  });

  return NextResponse.json({ url: session.url });
}
