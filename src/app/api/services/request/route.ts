import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsApp, distanceKm } from "@/lib/whatsapp-send";
import { signBidLinkToken } from "@/lib/provider-auth";

const RADIUS_KM = 15;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";

const SERVICE_LABELS: Record<string, string> = {
  faxineira: "Faxina",
  pedreiro: "Pedreiro",
  eletricista: "Eletricista",
  encanador: "Encanador",
  pintor: "Pintor",
  outros: "Serviço geral",
};

export async function POST(req: NextRequest) {
  try {
    const { clientName, clientPhone, clientLat, clientLng, serviceType, description, scheduledDate } = await req.json();

    if (!clientName || !clientPhone || clientLat == null || clientLng == null || !serviceType || !scheduledDate) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const request = await prisma.serviceRequest.create({
      data: { clientName, clientPhone, clientLat, clientLng, serviceType, description, scheduledDate },
    });

    // Busca prestadores ativos do mesmo tipo de serviço
    const providers = await prisma.serviceProvider.findMany({
      where: { serviceType, status: "active" },
      select: { id: true, phone: true, lat: true, lng: true, name: true },
    });

    // Filtra por raio e envia WhatsApp com link de proposta
    const label = SERVICE_LABELS[serviceType] || serviceType;
    const nearby = providers.filter(p =>
      p.lat != null && p.lng != null && distanceKm(clientLat, clientLng, p.lat!, p.lng!) <= RADIUS_KM
    );

    await Promise.all(
      nearby.map(async (p) => {
        if (!p.phone) return;
        const bidToken = signBidLinkToken(p.id, request.id);
        const link = `${APP_URL}/provider/bid/${request.id}?t=${bidToken}`;
        const msg =
          `🔔 *Novo pedido perto de você!*\n\n` +
          `📋 Serviço: *${label}*\n` +
          `📅 Data: *${scheduledDate}*\n` +
          (description ? `📝 Detalhes: ${description}\n` : "") +
          `\n👉 Envie sua proposta de valor:\n${link}`;
        await sendWhatsApp(p.phone, msg);
      })
    );

    return NextResponse.json({ requestId: request.id, notified: nearby.length });
  } catch (e) {
    console.error("services/request error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
