import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const { nome, preco, destaques, salesLink, imageLinks, videoLinks } = await req.json();

    // Confirma que o produto pertence ao usuário
    const existente = await prisma.produtoVendedor.findUnique({ where: { slug: params.slug } });
    if (!existente) return NextResponse.json({ erro: "produto não encontrado" }, { status: 404 });
    if (existente.clientId !== user.sub) return NextResponse.json({ erro: "não autorizado" }, { status: 403 });

    const atualizado = await prisma.produtoVendedor.update({
      where: { slug: params.slug },
      data: {
        ...(nome      && { nome }),
        ...(preco     && { preco }),
        ...(destaques && { destaques }),
        ...(salesLink && { salesLink }),
        ...(imageLinks !== undefined && { imageLinks: (imageLinks as string[]).filter((l: string) => l.trim()) }),
        ...(videoLinks !== undefined && { videoLinks: (videoLinks as string[]).filter((l: string) => l.trim()) }),
      },
    });

    return NextResponse.json({ ok: true, slug: atualizado.slug });
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const produto = await prisma.produtoVendedor.findUnique({
      where: { slug: params.slug },
      select: { slug: true, nome: true, preco: true, destaques: true, salesLink: true, imageLinks: true, videoLinks: true, ativo: true, clientId: true },
    });

    if (!produto) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });
    if (produto.clientId !== user.sub) return NextResponse.json({ erro: "não autorizado" }, { status: 403 });

    return NextResponse.json(produto);
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
