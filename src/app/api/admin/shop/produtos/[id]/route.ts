import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PUT — editar produto
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const body = await req.json();
  const { nome, descricao, promptVendas, fotos, videos, linkFonte, custoCompra, prazoEntrega, precoVenda, comissaoPorc, ativo } = body;

  const produto = await prisma.produtoShop.update({
    where: { id: params.id },
    data: {
      nome,
      descricao,
      promptVendas,
      fotos: fotos || [],
      videos: videos || [],
      linkFonte: linkFonte || "",
      custoCompra: parseFloat(custoCompra) || 0,
      prazoEntrega: prazoEntrega || "",
      precoVenda: parseFloat(precoVenda),
      comissaoPorc: parseFloat(comissaoPorc) || 10,
      ativo: ativo !== undefined ? ativo : true,
    },
  });

  return NextResponse.json({ produto });
}

// DELETE — desativar produto
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  await prisma.produtoShop.update({ where: { id: params.id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
