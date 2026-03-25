export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { mp } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envia type=payment com id do pagamento
    const paymentId = body?.data?.id || req.nextUrl.searchParams.get("id");
    const type = body?.type || req.nextUrl.searchParams.get("type");

    if (type !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true }); // ignora outros eventos
    }

    const payment = new Payment(mp);
    const data = await payment.get({ id: String(paymentId) });

    if (data.status !== "approved") {
      return NextResponse.json({ ok: true }); // aguarda aprovação
    }

    const externalRef = data.external_reference;
    if (!externalRef) return NextResponse.json({ ok: true });

    const [clientId, slug] = externalRef.split("|");
    if (!clientId || !slug) return NextResponse.json({ ok: true });

    // Ativa cliente e define vencimento em 30 dias
    const planExpiresAt = new Date();
    planExpiresAt.setDate(planExpiresAt.getDate() + 30);

    await prisma.client.update({
      where: { id: clientId },
      data: {
        status: "active",
        plan: slug,
        planExpiresAt,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[MP Webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
