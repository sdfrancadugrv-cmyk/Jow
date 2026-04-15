import { NextRequest, NextResponse } from "next/server";
import { getArtigos, createArtigo, deleteArtigo } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(getArtigos(slug));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  const artigo = createArtigo({
    id: randomUUID(),
    site_slug: slug,
    titulo: body.titulo,
    conteudo: body.conteudo,
    publicado: body.publicado ?? false,
    criado_em: new Date().toISOString(),
  });
  return NextResponse.json(artigo, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  deleteArtigo(id);
  return NextResponse.json({ ok: true });
}
