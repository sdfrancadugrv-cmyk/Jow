import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthProvider, signProviderToken } from "@/lib/provider-auth";
import prisma from "@/lib/prisma";

async function activateProvider(providerId: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return prisma.serviceProvider.update({
    where: { id: providerId },
    data: { status: "active", expiresAt },
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthProvider();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();

  try {
    // PaymentIntent (novo fluxo cartão)
    if (body.paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);
      if (pi.status !== "succeeded") return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
      const provider = await activateProvider(auth.sub);
      const token = signProviderToken({ sub: provider.id, email: provider.email || "", name: provider.name, status: "active" });
      const res = NextResponse.json({ ok: true });
      res.cookies.set("kadosh_provider_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
      return res;
    }

    // Checkout Session (fluxo antigo — mantém compatibilidade)
    if (body.sessionId) {
      const session = await stripe.checkout.sessions.retrieve(body.sessionId);
      if (session.payment_status !== "paid" && session.status !== "complete") {
        return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
      }
      const provider = await activateProvider(auth.sub);
      const token = signProviderToken({ sub: provider.id, email: provider.email || "", name: provider.name, status: "active" });
      const res = NextResponse.json({ ok: true });
      res.cookies.set("kadosh_provider_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
      return res;
    }

    return NextResponse.json({ error: "Parâmetro inválido" }, { status: 400 });
  } catch (e) {
    console.error("confirm-payment error:", e);
    return NextResponse.json({ error: "Erro ao confirmar pagamento" }, { status: 500 });
  }
}
