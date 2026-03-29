import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

function slug(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// GET — listar todos os produtos
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const produtos = await prisma.produtoShop.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { vendas: true, cliques: true } },
    },
  });

  return NextResponse.json({ produtos });
}

// POST — criar produto
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const body = await req.json();
  const { nome, descricao, promptVendas, fotos, videos, fotosResultados, linkFonte, custoCompra, prazoEntrega, precoVenda, precoComInstalacao, comissaoPorc } = body;

  if (!nome || !descricao || !promptVendas || !precoVenda) {
    return NextResponse.json({ erro: "Campos obrigatórios: nome, descrição, prompt de vendas, preço." }, { status: 400 });
  }

  const baseSlug = slug(nome);
  let finalSlug = baseSlug;
  let count = 1;
  while (await prisma.produtoShop.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${count++}`;
  }

  const produto = await prisma.produtoShop.create({
    data: {
      slug: finalSlug,
      nome,
      descricao,
      promptVendas,
      fotos: fotos || [],
      videos: videos || [],
      fotosResultados: fotosResultados || [],
      linkFonte: linkFonte || "",
      custoCompra: parseFloat(custoCompra) || 0,
      prazoEntrega: prazoEntrega || "",
      precoVenda: parseFloat(precoVenda),
      precoComInstalacao: precoComInstalacao ? parseFloat(precoComInstalacao) : null,
      comissaoPorc: parseFloat(comissaoPorc) || 10,
    },
  });

  return NextResponse.json({ produto });
}
