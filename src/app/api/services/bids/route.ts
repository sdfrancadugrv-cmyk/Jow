import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const requestId = req.nextUrl.searchParams.get("requestId");
    if (!requestId) return NextResponse.json({ error: "requestId obrigatório" }, { status: 400 });

    const serviceRequest = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, serviceType: true, scheduledDate: true, description: true, status: true },
    });
    if (!serviceRequest) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

    const bids = await prisma.bid.findMany({
      where: { requestId, status: "active" },
      include: {
        provider: { select: { name: true, rating: true, reviewCount: true, city: true } },
      },
      orderBy: { price: "asc" },
    });

    return NextResponse.json({
      request: serviceRequest,
      bids: bids.map(b => ({
        id: b.id,
        price: b.price,
        providerId: b.providerId,
        providerName: b.provider.name,
        providerRating: b.provider.rating,
        providerReviewCount: b.provider.reviewCount,
        providerCity: b.provider.city,
      })),
    });
  } catch (e) {
    console.error("services/bids error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
