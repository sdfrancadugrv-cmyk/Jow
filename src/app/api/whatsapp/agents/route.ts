export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const ZAPI_BASE = "https://api.z-api.io/instances";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";

async function configureZAPIWebhook(instanceId: string, token: string, webhookUrl: string) {
  const headers = { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN };
  // Webhook de mensagens recebidas (do lead)
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/update-webhook-received`, {
    method: "POST", headers,
    body: JSON.stringify({ value: webhookUrl }),
  });
  // Webhook de mensagens enviadas (pelo humano ou pelo bot) — necessário para detectar takeover humano
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/update-webhook-send`, {
    method: "POST", headers,
    body: JSON.stringify({ value: webhookUrl }),
  });
}

// GET — lista agentes do usuário
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const agents = await prisma.whatsappAgent.findMany({
    where: { clientId: user.sub },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(agents);
}

// POST — cria novo agente
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { instanceId, token, phone, name, personality, followupRules, mediaLibrary } = await req.json();

  if (!instanceId || !token || !phone || !name || !personality) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const agent = await prisma.whatsappAgent.create({
    data: {
      clientId: user.sub,
      instanceId,
      token,
      phone,
      name,
      personality,
      followupRules: followupRules ?? [],
      mediaLibrary: mediaLibrary ?? [],
    },
  });

  // Configura o webhook na Z-API automaticamente
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`;
  await configureZAPIWebhook(instanceId, token, webhookUrl);

  return NextResponse.json(agent);
}

// DELETE — remove agente
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await req.json();

  await prisma.whatsappAgent.deleteMany({
    where: { id, clientId: user.sub },
  });

  return NextResponse.json({ ok: true });
}
