import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get("codigo");
  if (!codigo) return NextResponse.json({ erro: "Código inválido" }, { status: 400 });

  const afiliado = await prisma.afiliadoShop.findUnique({
    where: { codigo },
    include: {
      vendas: {
        include: { produto: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      saques: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { cliques: true, vendas: true } },
    },
  });

  if (!afiliado) return NextResponse.json({ erro: "Afiliado não encontrado" }, { status: 404 });

  return NextResponse.json({ afiliado });
}
