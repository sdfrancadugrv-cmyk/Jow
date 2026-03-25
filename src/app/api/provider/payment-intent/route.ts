import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthProvider } from "@/lib/provider-auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await getAuthProvider();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const provider = await prisma.serviceProvider.findUnique({ where: { id: auth.sub } });
  if (!provider) return NextResponse.json({ error: "Prestador não encontrado" }, { status: 404 });

  const { method } = await req.json(); // "card" | "pix"

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 2990,
    currency: "brl",
    payment_method_types: method === "pix" ? ["pix"] : ["card"],
    metadata: { providerId: provider.id },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
