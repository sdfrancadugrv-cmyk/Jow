export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const conversations = await prisma.whatsappConversation.findMany({
    where: { agent: { clientId: user.sub } },
    select: {
      id: true,
      contact: true,
      humanMode: true,
      updatedAt: true,
      messages: true,
      agent: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(conversations);
}
