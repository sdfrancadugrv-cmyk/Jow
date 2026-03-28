import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const produto = await prisma.produtoShop.findUnique({
    where: { slug: params.slug, ativo: true },
  });

  if (!produto) return NextResponse.json({ erro: "Produto não encontrado" }, { status: 404 });

  // Registra clique se vier com ?ref=CODIGO
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref) {
    const afiliado = await prisma.afiliadoShop.findUnique({ where: { codigo: ref } });
    if (afiliado) {
      const ip = req.headers.get("x-forwarded-for") || "";
      await prisma.cliqueShop.create({
        data: { afiliadoId: afiliado.id, produtoId: produto.id, ip },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ produto });
}
