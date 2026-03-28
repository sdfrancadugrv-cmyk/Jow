import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://JENNIFER-ai.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { bidId, requestId } = await req.json();

    if (!bidId || !requestId) {
      return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "open") {
      return NextResponse.json({ error: "Pedido já encerrado" }, { status: 410 });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { provider: { select: { name: true } } },
    });
    if (!bid || bid.requestId !== requestId) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    // Cria Stripe Checkout Session — pagamento único R$9,90
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "brl",
          unit_amount: 990, // R$9,90
          product_data: {
            name: `Desbloquear contato — ${bid.provider.name}`,
            description: "Após o pagamento você recebe o WhatsApp do prestador escolhido.",
          },
        },
        quantity: 1,
      }],
      metadata: { bidId, requestId },
      success_url: `${APP_URL}/services/contato/${requestId}?bid=${bidId}&session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/services/${requestId}`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (e) {
    console.error("services/select error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
