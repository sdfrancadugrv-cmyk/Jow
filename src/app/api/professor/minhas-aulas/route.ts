import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const aulas = await prisma.aulaProfessor.findMany({
      where: { clientId: user.sub },
      orderBy: { createdAt: "desc" },
      select: { id: true, materia: true, resumo: true, plano: true, createdAt: true },
    });

    // Agrupa por matéria (nome único) para a tela de seleção
    const materias = Array.from(
      new Map(aulas.map(a => [a.materia, a])).values()
    );

    return NextResponse.json({ aulas, materias });
  } catch (e: any) {
    console.error("[PROFESSOR/MINHAS-AULAS]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
