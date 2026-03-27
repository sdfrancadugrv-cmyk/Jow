export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const produto = await prisma.produtoVendedor.findUnique({
      where: { slug: params.slug },
      select: { nome: true, preco: true, imageLinks: true, videoLinks: true, salesLink: true, estrutura: true, template: true, ativo: true, permitirAfiliados: true, modalidadeVenda: true, whatsappContato: true, pixKey: true },
    });
    if (!produto || !produto.ativo) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
    return NextResponse.json(produto);
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
