import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthProvider, signProviderToken } from "@/lib/provider-auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const auth = await getAuthProvider();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Session ID obrigatório" }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const provider = await prisma.serviceProvider.update({
      where: { id: auth.sub },
      data: {
        status: "active",
        expiresAt,
        stripeCustomerId: session.customer as string,
      },
    });

    const token = signProviderToken({
      sub: provider.id,
      email: provider.email || "",
      name: provider.name,
      status: "active",
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("kadosh_provider_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (e) {
    console.error("confirm-payment error:", e);
    return NextResponse.json({ error: "Erro ao confirmar pagamento" }, { status: 500 });
  }
}
