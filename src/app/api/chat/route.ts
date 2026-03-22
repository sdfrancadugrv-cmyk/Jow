export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/core/orchestrator/JowOrchestrator";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { message, history = [] } = await req.json();
    if (!message) return NextResponse.json({ error: "Mensagem não fornecida" }, { status: 400 });

    const result = await orchestrate(message, history, user.sub);

    return NextResponse.json({ response: result.response, agentsUsed: result.agentsUsed });
  } catch (error) {
    console.error("Erro no chat:", error);
    return NextResponse.json({ error: "Falha no processamento" }, { status: 500 });
  }
}
