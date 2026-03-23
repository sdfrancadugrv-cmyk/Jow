export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ZAPI_BASE = "https://api.z-api.io/instances";

export async function GET() {
  const clientToken = process.env.ZAPI_CLIENT_TOKEN || "";

  // Busca o primeiro agente ativo
  const agent = await prisma.whatsappAgent.findFirst({
    where: { active: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Nenhum agente encontrado" });
  }

  // Tenta enviar mensagem de teste
  const url = `${ZAPI_BASE}/${agent.instanceId}/token/${agent.token}/send-text`;

  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Token": clientToken,
    },
    body: JSON.stringify({
      phone: agent.phone,
      message: "Teste de conexão KADOSH ✓",
    }),
  });

  const body = await result.text();

  return NextResponse.json({
    status: result.status,
    body,
    usedClientToken: clientToken.slice(0, 8) + "...",
    instanceId: agent.instanceId,
    phone: agent.phone,
    url,
  });
}
