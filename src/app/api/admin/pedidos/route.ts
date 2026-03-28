export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const pedidos = await prisma.pedidoInstalacao.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pedidos });
  } catch (err) {
    console.error("[Admin/Pedidos]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
