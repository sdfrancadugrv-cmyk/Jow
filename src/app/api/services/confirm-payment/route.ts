import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { sendWhatsApp } from "@/lib/whatsapp-send";

export async function POST(req: NextRequest) {
  try {
    const { bidId, requestId, sessionId } = await req.json();

    if (!bidId || !requestId || !sessionId) {
      return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    // Verifica sessão Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Pagamento não confirmado" }, { status: 402 });
    }
    if (session.metadata?.bidId !== bidId || session.metadata?.requestId !== requestId) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 403 });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        provider: { select: { name: true, phone: true } },
        request: { select: { clientName: true, clientPhone: true, serviceType: true, scheduledDate: true, status: true } },
      },
    });
    if (!bid) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });

    // Idempotência — se já foi selecionada, apenas retorna o contato
    if (bid.status === "selected") {
      return NextResponse.json({ providerPhone: bid.provider.phone, providerName: bid.provider.name });
    }

    if (bid.request.status !== "open") {
      return NextResponse.json({ error: "Pedido já encerrado" }, { status: 410 });
    }

    // Fecha o pedido e marca bid como selecionada
    await prisma.$transaction([
      prisma.serviceRequest.update({ where: { id: requestId }, data: { status: "closed" } }),
      prisma.bid.update({ where: { id: bidId }, data: { status: "selected" } }),
      prisma.bid.updateMany({ where: { requestId, id: { not: bidId } }, data: { status: "rejected" } }),
    ]);

    // Notifica prestador via WhatsApp
    const msg =
      `🎉 *Você foi escolhido!*\n\n` +
      `Cliente: *${bid.request.clientName}*\n` +
      `Serviço: ${bid.request.serviceType}\n` +
      `Data: ${bid.request.scheduledDate}\n\n` +
      `WhatsApp do cliente: *${bid.request.clientPhone}*\n\n` +
      `Entre em contato para combinar os detalhes. Bom trabalho!`;
    if (bid.provider.phone) await sendWhatsApp(bid.provider.phone, msg);

    return NextResponse.json({ providerPhone: bid.provider.phone, providerName: bid.provider.name });
  } catch (e) {
    console.error("confirm-payment error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
