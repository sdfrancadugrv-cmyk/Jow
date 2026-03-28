import { NextRequest, NextResponse } from "next/server";
import { Payment } from "mercadopago";
import { mp } from "@/lib/mercadopago";
import prisma from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp-send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";

function parsePreco(preco: string): number {
  const cleaned = preco.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export async function POST(req: NextRequest) {
  try {
    const { codigo, clientePhone } = await req.json();

    if (!codigo || !clientePhone?.trim()) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const cleanPhone = clientePhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }

    const afiliado = await prisma.afiliado.findUnique({ where: { codigo } });
    if (!afiliado) {
      return NextResponse.json({ error: "Afiliado não encontrado" }, { status: 404 });
    }

    const produto = await prisma.produtoVendedor.findUnique({
      where: { slug: afiliado.slug },
      select: { nome: true, preco: true },
    });
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    const valor = parsePreco(produto.preco);
    if (valor <= 0) {
      return NextResponse.json({ error: "Preço do produto inválido" }, { status: 400 });
    }

    const payment = new Payment(mp);
    const result = await payment.create({
      body: {
        transaction_amount: valor,
        description: produto.nome,
        payment_method_id: "pix",
        payer: { email: "cliente@kadosh.app" },
        external_reference: `venda|${afiliado.id}|${afiliado.slug}|${cleanPhone}|${valor}`,
        notification_url: `${APP_URL}/api/mercadopago/webhook`,
      },
    });

    const pixCode = result.point_of_interaction?.transaction_data?.qr_code ?? null;
    const pixQrBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;

    // Envia o PIX pro cliente via WhatsApp
    if (pixCode) {
      await sendWhatsApp(
        cleanPhone,
        `🛒 *${produto.nome}*\n\nOlá! Aqui está seu link de pagamento PIX.\n\n` +
        `💰 Valor: *${produto.preco}*\n\n` +
        `📋 *Código PIX (copia e cola):*\n${pixCode}\n\n` +
        `✅ Após o pagamento, você receberá a confirmação automática e seu pedido será preparado para entrega em até *3 dias úteis*.`
      );
    }

    return NextResponse.json({
      paymentId: result.id,
      status: result.status,
      pixCode,
      pixQrBase64,
      valor,
      clientePhone: cleanPhone,
    });
  } catch (err) {
    console.error("[Afiliado/GerarPagamento]", err);
    return NextResponse.json({ error: "Erro ao gerar pagamento" }, { status: 500 });
  }
}
