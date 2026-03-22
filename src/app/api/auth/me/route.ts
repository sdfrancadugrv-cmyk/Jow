export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const client = await prisma.client.findUnique({
    where: { id: user.sub },
    select: { id: true, name: true, email: true, status: true, plan: true, devices: { select: { id: true, name: true, lastSeen: true } } },
  });

  if (!client) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(client);
}
