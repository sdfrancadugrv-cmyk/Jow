import { NextRequest, NextResponse } from "next/server";
import { getProdutos, createProduto, deleteProduto, updateProduto } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(getProdutos(slug));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  const produto = createProduto({
    id: randomUUID(),
    site_slug: slug,
    nome: body.nome,
    preco: body.preco,
    foto_url: body.foto_url ?? "",
    descricao: body.descricao ?? "",
    categoria: body.categoria ?? "",
  });
  return NextResponse.json(produto, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json();
  return NextResponse.json(updateProduto(id, updates));
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  deleteProduto(id);
  return NextResponse.json({ ok: true });
}
