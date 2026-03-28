export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp-send";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Desativa prestadores com plano expirado
  const expired = await prisma.serviceProvider.findMany({
    where: { status: "active", expiresAt: { lt: now } },
    select: { id: true, phone: true, name: true },
  });

  for (const p of expired) {
    await prisma.serviceProvider.update({
      where: { id: p.id },
      data: { status: "inactive" },
    });
    if (p.phone) {
      await sendWhatsApp(p.phone,
        `Olá ${p.name}! Seu plano JENNIFER Prestador expirou. Para continuar recebendo pedidos, renove em: https://JENNIFER-ai.vercel.app/provider/subscribe`
      );
    }
  }

  // Notifica prestadores que expiram em 7 dias
  const in7days = new Date(now);
  in7days.setDate(in7days.getDate() + 7);
  const in8days = new Date(now);
  in8days.setDate(in8days.getDate() + 8);

  const expiringSoon = await prisma.serviceProvider.findMany({
    where: {
      status: "active",
      expiresAt: { gte: in7days, lt: in8days },
    },
    select: { id: true, phone: true, name: true, expiresAt: true },
  });

  for (const p of expiringSoon) {
    if (p.phone) {
      await sendWhatsApp(p.phone,
        `Olá ${p.name}! Seu plano JENNIFER Prestador vence em 7 dias. Renove agora para não perder pedidos: https://JENNIFER-ai.vercel.app/provider/subscribe`
      );
    }
  }

  return NextResponse.json({
    expired: expired.length,
    notified: expiringSoon.length,
  });
}
