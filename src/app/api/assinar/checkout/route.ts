import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { phone, slug, password } = await req.json();

    if (!PLANS[slug]) return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 });

    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    let client = await prisma.client.findUnique({ where: { phone: cleanPhone } });
    if (!client) {
      client = await prisma.client.create({
        data: { phone: cleanPhone, name: `Cliente ${cleanPhone}`, status: "inactive", password: hashed },
      });
    } else {
      client = await prisma.client.update({
        where: { phone: cleanPhone },
        data: { password: hashed },
      });
    }

    return NextResponse.json({ clientId: client.id });
  } catch (err) {
    console.error("[AssinarCheckout]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
