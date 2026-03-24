import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { bidId, requestId, providerRating, providerComment, clientRating, clientComment } = await req.json();

    if (!bidId || !requestId || providerRating == null || clientRating == null) {
      return NextResponse.json({ error: "Dados obrigatórios faltando" }, { status: 400 });
    }

    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: { request: true },
    });
    if (!bid || bid.requestId !== requestId) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    // Impede avaliação duplicada
    const existing = await prisma.serviceReview.findUnique({ where: { bidId } });
    if (existing) return NextResponse.json({ error: "Já avaliado" }, { status: 409 });

    await prisma.serviceReview.create({
      data: {
        requestId,
        bidId,
        providerId: bid.providerId,
        clientPhone: bid.request.clientPhone,
        providerRating: Number(providerRating),
        providerComment,
        clientRating: Number(clientRating),
        clientComment,
      },
    });

    // Recalcula média do prestador
    const reviews = await prisma.serviceReview.findMany({ where: { providerId: bid.providerId } });
    const avg = reviews.reduce((s, r) => s + r.providerRating, 0) / reviews.length;
    await prisma.serviceProvider.update({
      where: { id: bid.providerId },
      data: { rating: Math.round(avg * 10) / 10, reviewCount: reviews.length },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("services/review error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
