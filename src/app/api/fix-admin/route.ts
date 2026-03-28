import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Endpoint temporário para corrigir o admin — DELETE após uso
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_FIX_SECRET && secret !== "kadosh2024fix") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const phone = req.nextUrl.searchParams.get("phone") || "55997275348";

  const client = await prisma.client.findUnique({ where: { phone } });
  if (!client) {
    // Lista todos os clientes para diagnóstico
    const all = await prisma.client.findMany({ select: { phone: true, name: true, isAdmin: true, status: true } });
    return NextResponse.json({ error: "not found", phone, all });
  }

  const updated = await prisma.client.update({
    where: { phone },
    data: { isAdmin: true, status: "active" },
    select: { phone: true, name: true, isAdmin: true, status: true },
  });

  return NextResponse.json({ ok: true, updated });
}
