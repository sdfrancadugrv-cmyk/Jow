import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";

const mpConfig = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    const { produtoSlug, nomeCliente, telefoneCliente, enderecoCliente, refAfiliado } = await req.json();

    if (!nomeCliente || !telefoneCliente || !enderecoCliente) {
      return NextResponse.json({ erro: "Preencha nome, telefone e endereço." }, { status: 400 });
    }

    const produto = await prisma.produtoShop.findUnique({ where: { slug: produtoSlug, ativo: true } });
    if (!produto) return NextResponse.json({ erro: "Produto não encontrado" }, { status: 404 });

    const afiliado = refAfiliado
      ? await prisma.afiliadoShop.findUnique({ where: { codigo: refAfiliado } })
      : null;

    // Cria venda pendente
    const venda = await prisma.vendaShop.create({
      data: {
        produtoId: produto.id,
        afiliadoId: afiliado?.id || null,
        nomeCliente,
        telefoneCliente,
        enderecoCliente,
        whatsappCliente: telefoneCliente,
        valorPago: produto.precoVenda,
        comissaoValor: afiliado ? (produto.precoVenda * produto.comissaoPorc) / 100 : 0,
        status: "pendente",
      },
    });

    const appUrl = "https://jennifer-ai.vercel.app";

    // Gera PIX direto via Mercado Pago
    const emailPagador = `${telefoneCliente.replace(/\D/g, "")}@compradores.jennifer.shop`;
    const paymentClient = new Payment(mpConfig);
    const paymentResult = await paymentClient.create({
      body: {
        transaction_amount: produto.precoVenda,
        description: produto.nome,
        payment_method_id: "pix",
        payer: {
          email: emailPagador,
          first_name: nomeCliente.split(" ")[0],
          last_name: nomeCliente.split(" ").slice(1).join(" ") || nomeCliente.split(" ")[0],
        },
        external_reference: `shop|${venda.id}`,
        notification_url: `${appUrl}/api/shop/webhook`,
      },
    });

    const txData = (paymentResult as any)?.point_of_interaction?.transaction_data;

    return NextResponse.json({
      vendaId: venda.id,
      pixQrCode: txData?.qr_code || null,
      pixQrCodeBase64: txData?.qr_code_base64 || null,
      valor: produto.precoVenda,
    });
  } catch (e: any) {
    console.error("[SHOP/CHECKOUT]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
