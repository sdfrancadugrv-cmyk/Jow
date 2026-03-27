export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { codigo: string } }) {
  try {
    const afiliado = await prisma.afiliado.findUnique({
      where: { codigo: params.codigo },
      include: {
        vendas: { orderBy: { createdAt: "desc" }, take: 50 },
        saques: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!afiliado) {
      return NextResponse.json({ error: "Afiliado não encontrado" }, { status: 404 });
    }

    const produto = await prisma.produtoVendedor.findUnique({
      where: { slug: afiliado.slug },
      select: { nome: true, preco: true },
    });

    const totalVendas = afiliado.vendas.length;
    const totalGanho = afiliado.vendas.reduce((acc, v) => acc + v.comissao, 0);
    const sacado = afiliado.saques
      .filter(s => s.status === "pago")
      .reduce((acc, s) => acc + s.valor, 0);

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";

    return NextResponse.json({
      afiliado: {
        id: afiliado.id,
        nome: afiliado.nome,
        whatsapp: afiliado.whatsapp,
        codigo: afiliado.codigo,
        saldo: afiliado.saldo,
        createdAt: afiliado.createdAt,
      },
      produto: produto || { nome: afiliado.slug, preco: "" },
      stats: { totalVendas, totalGanho, sacado },
      vendas: afiliado.vendas,
      saques: afiliado.saques,
      linkAfiliado: `${APP_URL}/vendedor/${afiliado.slug}?ref=${afiliado.codigo}`,
    });
  } catch (err) {
    console.error("[Afiliado/Dashboard]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
