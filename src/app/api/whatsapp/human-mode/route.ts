export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// POST — ativa ou desativa modo humano para um contato
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { conversationId, humanMode } = await req.json();
  if (!conversationId || typeof humanMode !== "boolean") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // Verifica que a conversa pertence a um agente do usuário
  const convo = await prisma.whatsappConversation.findFirst({
    where: { id: conversationId, agent: { clientId: user.sub } },
  });

  if (!convo) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.whatsappConversation.update({
    where: { id: conversationId },
    data: {
      humanMode,
      // Ao reativar o bot, limpa buffer para começar fresh
      ...(humanMode === false && { pendingMessages: [], pendingMsgIds: [], bufferUpdatedAt: null, bufferVersion: "" }),
    },
  });

  return NextResponse.json({ ok: true, humanMode });
}
