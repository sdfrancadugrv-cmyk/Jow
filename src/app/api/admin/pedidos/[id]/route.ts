import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp-send";

const MENSAGENS: Record<string, string> = {
  pago: "✅ Seu pagamento foi confirmado! Entraremos em contato em breve para agendar a instalação.",
  agendado: "📅 Sua instalação foi agendada! Em breve entraremos em contato com data e hora.",
  instalado: "🎉 Instalação concluída com sucesso! Obrigado por escolher nosso produto.",
  cancelado: "❌ Seu pedido foi cancelado. Entre em contato para mais informações.",
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser();
    if (!user?.isAdmin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const { status, obs } = await req.json();
    const statusValidos = ["aguardando", "pago", "agendado", "instalado", "cancelado"];
    if (!statusValidos.includes(status)) return NextResponse.json({ error: "Status inválido" }, { status: 400 });

    const pedido = await prisma.pedidoInstalacao.update({
      where: { id: params.id },
      data: { status, ...(obs !== undefined && { obs }) },
    });

    // Libera comissão do afiliado quando marcado como pago
    const pedidoAny = pedido as any;
    if (status === "pago" && pedidoAny.afiliadoId) {
      await prisma.afiliado.update({
        where: { id: pedidoAny.afiliadoId },
        data: { saldo: { increment: pedidoAny.comissao } },
      });
      await prisma.vendaAfiliado.create({
        data: {
          afiliadoId: pedidoAny.afiliadoId,
          produtoSlug: pedidoAny.produtoSlug,
          clientePhone: pedidoAny.telefone,
          valorPago: 0,
          comissao: pedidoAny.comissao,
          status: "paga",
        },
      });
      const afiliado = await prisma.afiliado.findUnique({ where: { id: pedidoAny.afiliadoId }, select: { whatsapp: true, codigo: true } });
      if (afiliado?.whatsapp) {
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";
        await sendWhatsApp(afiliado.whatsapp, `🎉 *Venda confirmada!* Comissão de R$ 30,00 liberada no seu dashboard:\n${APP_URL}/afiliado/${afiliado.codigo}`);
      }
    }

    // Notifica o cliente via WhatsApp
    const msg = MENSAGENS[status];
    if (msg && pedido.telefone) {
      await sendWhatsApp(pedido.telefone, msg);
    }

    return NextResponse.json({ ok: true, pedido });
  } catch (err) {
    console.error("[Admin/Pedidos/Update]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
