export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// GET — retorna um agente específico do usuário
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const agent = await prisma.whatsappAgent.findFirst({
    where: { id: params.id, clientId: user.sub },
  });

  if (!agent) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  return NextResponse.json(agent);
}

// PATCH — atualiza campos do agente
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const allowed = ["name", "personality", "followupRules", "mediaLibrary", "active"];
  const data: Record<string, any> = {};

  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const agent = await prisma.whatsappAgent.updateMany({
    where: { id: params.id, clientId: user.sub },
    data,
  });

  if (agent.count === 0) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const updated = await prisma.whatsappAgent.findUnique({ where: { id: params.id } });
  return NextResponse.json(updated);
}
