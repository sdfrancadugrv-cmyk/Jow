import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthProvider } from "@/lib/provider-auth";
import prisma from "@/lib/prisma";

const APP_URL = "https://kadosh-ai.vercel.app";

export async function POST() {
  const auth = await getAuthProvider();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const provider = await prisma.serviceProvider.findUnique({ where: { id: auth.sub } });
  if (!provider) return NextResponse.json({ error: "Prestador não encontrado" }, { status: 404 });

  // Se já tem assinatura ativa, vai pro dashboard
  if (provider.status === "active") {
    return NextResponse.json({ url: `${APP_URL}/provider/dashboard` });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: provider.email || undefined,
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: "Kadosh Prestador",
            description: "Receba pedidos de clientes próximos a você via WhatsApp.",
          },
          unit_amount: 2990,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: { providerId: provider.id },
    success_url: `${APP_URL}/provider/dashboard?payment=success`,
    cancel_url: `${APP_URL}/provider/subscribe`,
  });

  return NextResponse.json({ url: session.url });
}
