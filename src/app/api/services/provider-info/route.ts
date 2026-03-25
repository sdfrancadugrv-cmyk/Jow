export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const provider = await prisma.serviceProvider.findUnique({
    where: { id },
    select: { name: true, serviceType: true, city: true, rating: true, reviewCount: true, dailyRate: true },
  });

  if (!provider) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json({ provider });
}
