import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const servico = req.nextUrl.searchParams.get("servico") || "";
  const cidade = req.nextUrl.searchParams.get("cidade") || "";

  const where: any = { status: "active" };
  if (servico) where.serviceType = { contains: servico };
  if (cidade) where.city = { contains: cidade, mode: "insensitive" };

  const prestadores = await prisma.serviceProvider.findMany({
    where,
    select: { id: true, name: true, phone: true, serviceType: true, city: true, foto: true, rating: true, reviewCount: true },
    orderBy: { rating: "desc" },
  });

  return NextResponse.json({ prestadores });
}
