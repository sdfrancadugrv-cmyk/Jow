export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ZAPI_BASE = "https://api.z-api.io/instances";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";

async function sendText(instanceId: string, token: string, phone: string, message: string) {
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": ZAPI_CLIENT_TOKEN,
    },
    body: JSON.stringify({ phone, message }),
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const enviados: string[] = [];

    // Busca todos os agentes ativos que têm regras de followup
    const agents = await prisma.whatsappAgent.findMany({
      where: { active: true },
    });

    const agentsComFollowup = agents.filter((a) => {
      const rules = (a.followupRules as any[]) ?? [];
      return rules.length > 0;
    });

    if (agentsComFollowup.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0 });
    }

    const agentIds = agentsComFollowup.map((a) => a.id);

    // Busca conversas dos agentes sem pending e sem humanMode
    const conversas = await prisma.whatsappConversation.findMany({
      where: {
        agentId: { in: agentIds },
        humanMode: false,
        bufferVersion: "",       // sem buffer ativo
        pendingMessages: { equals: [] },
      },
    });

    const agora = Date.now();

    for (const convo of conversas) {
      const agent = agentsComFollowup.find((a) => a.id === convo.agentId);
      if (!agent) continue;

      const rules = (agent.followupRules as { horas: number; mensagem: string }[]) ?? [];
      if (rules.length === 0) continue;

      const messages = (convo.messages as { role: string; content: string }[]) ?? [];
      if (messages.length === 0) continue;

      // Só dispara followup se a última mensagem foi do assistente (bot)
      // ou seja, o lead não respondeu ainda
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role !== "assistant") continue;

      // Tempo desde a última atualização da conversa
      const ultimaAtividade = new Date(convo.updatedAt).getTime();
      const horasPassadas = (agora - ultimaAtividade) / (1000 * 60 * 60);

      // Verifica qual regra se aplica (dentro de uma janela de 1h a partir do threshold)
      for (const rule of rules) {
        const threshold = rule.horas;
        if (horasPassadas >= threshold && horasPassadas < threshold + 1) {
          // Janela de disparo: [threshold, threshold+1h)
          // Evita re-disparo: confere se a última mensagem não é já o texto do followup
          if (lastMsg.content.trim() === rule.mensagem.trim()) break;

          try {
            await sendText(agent.instanceId, agent.token, convo.contact, rule.mensagem);

            // Salva o followup no histórico para evitar re-envio
            const updatedMessages = [
              ...messages,
              { role: "assistant", content: rule.mensagem },
            ];

            await prisma.whatsappConversation.update({
              where: { id: convo.id },
              data: { messages: updatedMessages },
            });

            enviados.push(`${convo.contact} (regra ${threshold}h)`);
            console.log(`[Followup] enviado para ${convo.contact} | agente: ${agent.name} | regra: ${threshold}h`);
          } catch (err) {
            console.error(`[Followup] erro para ${convo.contact}:`, err);
          }
          break; // só uma regra por conversa por ciclo
        }
      }
    }

    return NextResponse.json({ ok: true, enviados: enviados.length, detalhes: enviados });
  } catch (err) {
    console.error("[Cron followup]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
