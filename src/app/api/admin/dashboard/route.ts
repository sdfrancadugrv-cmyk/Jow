import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioSemana = new Date(hoje);
  inicioSemana.setDate(hoje.getDate() - 6);

  const [
    vendasHoje,
    vendasMes,
    vendasTotal,
    vendasRecentes,
    produtosRanking,
    afiliadosAtivos,
    saquesTotal,
  ] = await Promise.all([
    // vendas pagas hoje
    prisma.vendaShop.aggregate({
      where: { status: "pago", createdAt: { gte: hoje } },
      _count: { id: true },
      _sum: { valorPago: true },
    }),
    // vendas pagas no mês
    prisma.vendaShop.aggregate({
      where: { status: "pago", createdAt: { gte: inicioMes } },
      _count: { id: true },
      _sum: { valorPago: true },
    }),
    // total histórico pago
    prisma.vendaShop.aggregate({
      where: { status: "pago" },
      _count: { id: true },
      _sum: { valorPago: true, comissaoValor: true },
    }),
    // últimas 10 vendas pagas
    prisma.vendaShop.findMany({
      where: { status: "pago" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        produto: { select: { nome: true } },
        afiliado: { select: { nome: true } },
      },
    }),
    // ranking de produtos por vendas pagas
    prisma.vendaShop.groupBy({
      by: ["produtoId"],
      where: { status: "pago" },
      _count: { id: true },
      _sum: { valorPago: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    // afiliados ativos (com pelo menos 1 venda)
    prisma.afiliadoShop.count({ where: { ativo: true } }),
    // total pago em saques
    prisma.saqueShop.aggregate({
      where: { status: "pago" },
      _sum: { valor: true },
    }),
  ]);

  // busca nomes dos produtos do ranking
  const produtoIds = produtosRanking.map(p => p.produtoId);
  const produtosNomes = await prisma.produtoShop.findMany({
    where: { id: { in: produtoIds } },
    select: { id: true, nome: true },
  });
  const nomeMap = Object.fromEntries(produtosNomes.map(p => [p.id, p.nome]));

  return NextResponse.json({
    cards: {
      vendasHoje: vendasHoje._count.id,
      receitaHoje: vendasHoje._sum.valorPago || 0,
      vendasMes: vendasMes._count.id,
      receitaMes: vendasMes._sum.valorPago || 0,
      vendasTotal: vendasTotal._count.id,
      receitaTotal: vendasTotal._sum.valorPago || 0,
      comissoesTotal: vendasTotal._sum.comissaoValor || 0,
      afiliadosAtivos,
      saquesTotal: saquesTotal._sum.valor || 0,
    },
    vendasRecentes,
    produtosRanking: produtosRanking.map(p => ({
      nome: nomeMap[p.produtoId] || "Produto",
      vendas: p._count.id,
      receita: p._sum.valorPago || 0,
    })),
  });
}
