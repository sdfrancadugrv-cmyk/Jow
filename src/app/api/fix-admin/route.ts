import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

// Endpoint temporário para corrigir o admin — DELETE após uso
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_FIX_SECRET && secret !== "kadosh2024fix") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Lista todos os clientes para diagnóstico
  const all = await prisma.client.findMany({
    select: { phone: true, name: true, isAdmin: true, status: true },
  });

  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ clientes: all });
  }

  const client = await prisma.client.findUnique({ where: { phone } });
  if (!client) {
    return NextResponse.json({ error: "not found", phone, clientes: all });
  }

  const newPassword = req.nextUrl.searchParams.get("senha") || "#viDareta7";
  const hash = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.client.update({
    where: { phone },
    data: { isAdmin: true, status: "active", password: hash },
    select: { phone: true, name: true, isAdmin: true, status: true },
  });

  return NextResponse.json({ ok: true, updated, senhaRedefinida: newPassword });
}
