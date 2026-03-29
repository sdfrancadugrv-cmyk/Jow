import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";

const mpConfig = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paymentId = body?.data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    const paymentClient = new Payment(mpConfig);
    const payment = await paymentClient.get({ id: paymentId });
    if (payment?.status !== "approved") return NextResponse.json({ ok: true });

    const ref = payment.external_reference as string;
    if (!ref?.startsWith("shop|")) return NextResponse.json({ ok: true });

    const vendaId = ref.split("|")[1];
    const venda = await prisma.vendaShop.findUnique({
      where: { id: vendaId },
      include: { afiliado: true, produto: true },
    });

    if (!venda || venda.status === "pago") return NextResponse.json({ ok: true });

    // Marca venda como paga
    await prisma.vendaShop.update({
      where: { id: vendaId },
      data: { status: "pago", paymentId: String(paymentId) },
    });

    // Credita comissão ao afiliado imediatamente
    if (venda.afiliadoId && venda.comissaoValor > 0) {
      await prisma.afiliadoShop.update({
        where: { id: venda.afiliadoId },
        data: { saldo: { increment: venda.comissaoValor } },
      });

      // Avisa o afiliado via WhatsApp
      if (venda.afiliado?.whatsapp) {
        const msg = `✅ *Jennifer Shop* — Você ganhou uma comissão!\n\nProduto: ${venda.produto.nome}\nComissão: R$ ${venda.comissaoValor.toFixed(2).replace(".", ",")}\n\nAcesse seu painel para ver seu saldo.`;
        await fetch(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Client-Token": process.env.ZAPI_CLIENT_TOKEN! },
          body: JSON.stringify({ phone: venda.afiliado.whatsapp, message: msg }),
        }).catch(() => {});
      }
    }

    // Avisa o dono do app via WhatsApp
    if (process.env.OWNER_PHONE) {
      const msg = `🛍️ *Nova venda Jennifer Shop!*\n\nProduto: ${venda.produto.nome}\nCliente: ${venda.nomeCliente}\nTelefone: ${venda.telefoneCliente}\nEndereço: ${venda.enderecoCliente}\nValor: R$ ${venda.valorPago.toFixed(2).replace(".", ",")}\nAfiliado: ${venda.afiliado?.nome || "Direto"}\n\nLink do produto: ${venda.produto.linkFonte}`;
      await fetch(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": process.env.ZAPI_CLIENT_TOKEN! },
        body: JSON.stringify({ phone: process.env.OWNER_PHONE, message: msg }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[SHOP/WEBHOOK]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
