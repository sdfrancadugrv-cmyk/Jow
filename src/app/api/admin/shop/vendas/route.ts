import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "todos";

  const where = status === "todos" ? {} : { status };

  const [vendas, resumo] = await Promise.all([
    prisma.vendaShop.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        produto: { select: { nome: true, slug: true } },
        afiliado: { select: { nome: true, codigo: true } },
      },
    }),
    prisma.vendaShop.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { valorPago: true, comissaoValor: true },
    }),
  ]);

  const stats = {
    totalPagas: 0,
    receitaTotal: 0,
    comissoesPagas: 0,
    totalPendentes: 0,
  };

  for (const r of resumo) {
    if (r.status === "pago") {
      stats.totalPagas = r._count.id;
      stats.receitaTotal = r._sum.valorPago || 0;
      stats.comissoesPagas = r._sum.comissaoValor || 0;
    }
    if (r.status === "pendente") {
      stats.totalPendentes = r._count.id;
    }
  }

  return NextResponse.json({ vendas, stats });
}
