import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await prisma.client.findUnique({ where: { id: user.sub } });
  if (!client?.stripeCustomerId) {
    return NextResponse.json({ error: "Cliente Stripe não encontrado" }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripeCustomerId,
    return_url: `${APP_URL}/app`,
  });

  return NextResponse.json({ url: session.url });
}
