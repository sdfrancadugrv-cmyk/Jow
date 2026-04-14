export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const agents = await prisma.whatsappAgent.findMany({
    where: { clientId: user.sub },
    orderBy: { createdAt: "desc" },
  });

  const agentIds = agents.map((a) => a.id);

  const conversations = await prisma.whatsappConversation.findMany({
    where: { agentId: { in: agentIds } },
    select: {
      id: true,
      agentId: true,
      contact: true,
      messages: true,
      humanMode: true,
      updatedAt: true,
    },
  });

  // Agrupa conversas por agente
  const convosByAgent: Record<string, typeof conversations> = {};
  for (const convo of conversations) {
    if (!convosByAgent[convo.agentId]) convosByAgent[convo.agentId] = [];
    convosByAgent[convo.agentId].push(convo);
  }

  // Hoje em Brasília
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const agentsComStats = agents.map((agent) => {
    const convos = convosByAgent[agent.id] || [];
    const totalLeads = convos.length;
    const humanModeAtivos = convos.filter((c) => c.humanMode).length;

    let totalMensagens = 0;
    let mensagensHoje = 0;
    let leadsHoje = 0;

    for (const convo of convos) {
      const msgs = (convo.messages as any[]) ?? [];
      totalMensagens += msgs.length;

      const updatedDay = new Date(convo.updatedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      if (updatedDay === hoje) {
        leadsHoje++;
        // conta msgs de hoje (aproximação: msgs da conversa ativa hoje)
        mensagensHoje += msgs.filter((m: any) => {
          if (!m.createdAt) return false;
          const d = new Date(m.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
          return d === hoje;
        }).length;
      }
    }

    return {
      ...agent,
      stats: {
        totalLeads,
        humanModeAtivos,
        totalMensagens,
        mensagensHoje,
        leadsHoje,
      },
    };
  });

  // Totais globais
  const totais = {
    leads: conversations.length,
    mensagens: agentsComStats.reduce((s, a) => s + a.stats.totalMensagens, 0),
    leadsHoje: agentsComStats.reduce((s, a) => s + a.stats.leadsHoje, 0),
    humanModeAtivos: agentsComStats.reduce((s, a) => s + a.stats.humanModeAtivos, 0),
  };

  return NextResponse.json({ agents: agentsComStats, totais });
}
