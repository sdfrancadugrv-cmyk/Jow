export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { mp } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp-send";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envia type=payment com id do pagamento
    const paymentId = body?.data?.id || req.nextUrl.searchParams.get("id");
    const type = body?.type || req.nextUrl.searchParams.get("type");

    if (type !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true }); // ignora outros eventos
    }

    const payment = new Payment(mp);
    const data = await payment.get({ id: String(paymentId) });

    if (data.status !== "approved") {
      return NextResponse.json({ ok: true }); // aguarda aprovação
    }

    const externalRef = data.external_reference;
    if (!externalRef) return NextResponse.json({ ok: true });

    const parts = externalRef.split("|");
    if (parts.length < 2) return NextResponse.json({ ok: true });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Contratação de profissional: "hire|providerId|clientPhone|clientName"
    if (parts[0] === "hire") {
      const providerId = parts[1];
      const clientPhone = parts[2];
      const clientName = decodeURIComponent(parts[3] || "Cliente");

      const provider = await prisma.serviceProvider.findUnique({
        where: { id: providerId },
        select: { phone: true, name: true },
      });

      if (provider?.phone) {
        // Avisa o prestador
        await sendWhatsApp(
          provider.phone,
          `🔔 *KADOSH* — Novo cliente!\n\n*${clientName}* quer contratar seus serviços.\n📱 WhatsApp do cliente: *${clientPhone}*\n\nEntre em contato para combinar os detalhes.`
        );
        // Avisa o cliente
        await sendWhatsApp(
          clientPhone,
          `✅ *KADOSH* — Pagamento confirmado!\n\nO WhatsApp do profissional *${provider.name}* é:\n📱 *${provider.phone}*\n\nEntre em contato para combinar os detalhes.`
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Assinatura de prestador: "provider|providerId"
    if (parts[0] === "provider") {
      const providerId = parts[1];
      await prisma.serviceProvider.update({
        where: { id: providerId },
        data: { status: "active", expiresAt },
      });
      return NextResponse.json({ ok: true });
    }

    // Assinatura de cliente: "clientId|slug"
    const [clientId, slug] = parts;
    if (!clientId || !slug) return NextResponse.json({ ok: true });

    await prisma.client.update({
      where: { id: clientId },
      data: { status: "active", plan: slug, planExpiresAt: expiresAt },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[MP Webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
