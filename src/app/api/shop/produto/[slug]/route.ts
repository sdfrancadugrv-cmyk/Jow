import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const produto = await prisma.produtoShop.findUnique({
    where: { slug: params.slug, ativo: true },
  });

  if (!produto) return NextResponse.json({ erro: "Produto não encontrado" }, { status: 404 });

  // Registra clique — com ref de afiliado ou orgânico
  const ref = req.nextUrl.searchParams.get("ref");
  const ip = req.headers.get("x-forwarded-for") || "";
  if (ref) {
    const afiliado = await prisma.afiliadoShop.findUnique({ where: { codigo: ref } });
    if (afiliado) {
      await prisma.cliqueShop.create({
        data: { afiliadoId: afiliado.id, produtoId: produto.id, ip, tipo: "afiliado" },
      }).catch(() => {});
    }
  } else {
    await prisma.cliqueShop.create({
      data: { produtoId: produto.id, ip, tipo: "organico" },
    }).catch(() => {});
  }

  return NextResponse.json({ produto });
}
