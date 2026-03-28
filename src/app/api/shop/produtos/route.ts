import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const produtos = await prisma.produtoShop.findMany({
    where: { ativo: true },
    select: { id: true, slug: true, nome: true, descricao: true, fotos: true, precoVenda: true, comissaoPorc: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ produtos });
}
