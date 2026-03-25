import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PLANS } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const { phone, slug } = await req.json();

    if (!PLANS[slug]) return NextResponse.json({ error: "Plano não encontrado" }, { status: 400 });

    const cleanPhone = (phone || "").replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400 });
    }

    let client = await prisma.client.findUnique({ where: { phone: cleanPhone } });
    if (!client) {
      client = await prisma.client.create({
        data: { phone: cleanPhone, name: `Cliente ${cleanPhone}`, status: "inactive" },
      });
    }

    return NextResponse.json({ clientId: client.id });
  } catch (err) {
    console.error("[AssinarCheckout]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
