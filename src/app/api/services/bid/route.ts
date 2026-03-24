import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyBidLinkToken } from "@/lib/provider-auth";

export async function POST(req: NextRequest) {
  try {
    const { token, price } = await req.json();

    if (!token || price == null) {
      return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    const payload = verifyBidLinkToken(token);
    if (!payload) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 401 });

    const { providerId, requestId } = payload;

    // Verifica se pedido ainda está aberto
    const request = await prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== "open") {
      return NextResponse.json({ error: "Este pedido já foi encerrado" }, { status: 410 });
    }

    // Verifica se prestador já enviou proposta
    const existing = await prisma.bid.findUnique({
      where: { requestId_providerId: { requestId, providerId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Você já enviou uma proposta para este pedido" }, { status: 409 });
    }

    const bid = await prisma.bid.create({
      data: { requestId, providerId, price: Number(price) },
    });

    return NextResponse.json({ ok: true, bidId: bid.id });
  } catch (e) {
    console.error("services/bid error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// Retorna detalhes do pedido para o formulário de proposta (via token no link)
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("t");
    if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

    const payload = verifyBidLinkToken(token);
    if (!payload) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 401 });

    const request = await prisma.serviceRequest.findUnique({
      where: { id: payload.requestId },
      select: { serviceType: true, scheduledDate: true, description: true, status: true },
    });
    if (!request) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const provider = await prisma.serviceProvider.findUnique({
      where: { id: payload.providerId },
      select: { name: true },
    });

    return NextResponse.json({ request, provider, requestId: payload.requestId });
  } catch (e) {
    console.error("services/bid GET error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
