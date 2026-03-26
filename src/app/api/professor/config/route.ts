import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const LIMITES: Record<string, { linguas: number; concursos: number }> = {
  "professor-start": { linguas: 1, concursos: 1 },
  "professor-pro":   { linguas: 2, concursos: 2 },
  "professor-scale": { linguas: 99, concursos: 99 },
};

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const config = await prisma.configProfessor.findUnique({ where: { clientId: user.id } });
    return NextResponse.json({ config, limites: LIMITES[config?.plano || "professor-start"] });
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const { plano, linguas, concursos } = await req.json();
    const limites = LIMITES[plano];
    if (!limites) return NextResponse.json({ erro: "plano inválido" }, { status: 400 });

    if (linguas.length > limites.linguas)
      return NextResponse.json({ erro: `Seu plano permite até ${limites.linguas} língua(s)` }, { status: 400 });
    if (concursos.length > limites.concursos)
      return NextResponse.json({ erro: `Seu plano permite até ${limites.concursos} concurso(s)` }, { status: 400 });

    const config = await prisma.configProfessor.upsert({
      where:  { clientId: user.id },
      update: { plano, linguas, concursos },
      create: { clientId: user.id, plano, linguas, concursos },
    });

    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
