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

    // Venda de afiliado: "venda|afiliadoId|produtoSlug|clientePhone|valorPago"
    if (parts[0] === "venda") {
      const afiliadoId  = parts[1];
      const produtoSlug = parts[2];
      const clientePhone = parts[3];
      const valorPago   = parseFloat(parts[4] || "0");

      await prisma.vendaAfiliado.create({
        data: { afiliadoId, produtoSlug, clientePhone, valorPago, comissao: 30, paymentId: String(paymentId), status: "paga" },
      });

      await prisma.afiliado.update({
        where: { id: afiliadoId },
        data: { saldo: { increment: 30 } },
      });

      const afiliado = await prisma.afiliado.findUnique({ where: { id: afiliadoId }, select: { nome: true, whatsapp: true, codigo: true } });
      const pedidoNum = String(paymentId).slice(-6).toUpperCase();
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";

      // Comprovante para o cliente
      await sendWhatsApp(
        clientePhone,
        `✅ *Pagamento confirmado!*\n\n` +
        `Obrigado pela sua compra!\n` +
        `🔢 Pedido: *#${pedidoNum}*\n` +
        `💰 Valor pago: *R$ ${valorPago.toFixed(2).replace(".", ",")}*\n` +
        `🚚 Prazo de entrega: *até 3 dias úteis*\n\n` +
        `Qualquer dúvida, entre em contato com seu revendedor. 😊`
      );

      // Aviso para o admin
      const ownerPhone = process.env.OWNER_PHONE;
      if (ownerPhone) {
        await sendWhatsApp(
          ownerPhone,
          `🛒 *NOVA VENDA!*\n\n` +
          `Produto: ${produtoSlug}\n` +
          `Cliente: ${clientePhone}\n` +
          `Revendedor: ${afiliado?.nome ?? "?"} (${afiliado?.whatsapp ?? "?"})\n` +
          `Valor: *R$ ${valorPago.toFixed(2).replace(".", ",")}*\n` +
          `Comissão liberada: *R$ 30,00*\n` +
          `Pedido: #${pedidoNum}`
        );
      }

      // Aviso para o afiliado
      if (afiliado?.whatsapp) {
        await sendWhatsApp(
          afiliado.whatsapp,
          `🎉 *Parabéns! Nova venda confirmada!*\n\n` +
          `Pedido #${pedidoNum}\n` +
          `Comissão: *R$ 30,00*\n\n` +
          `O valor já está disponível para saque no seu dashboard:\n` +
          `${APP_URL}/afiliado/${afiliado.codigo}`
        );
      }

      return NextResponse.json({ ok: true });
    }

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
