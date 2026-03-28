import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import MercadoPago from "mercadopago";

const mp = new MercadoPago({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });

export async function POST(req: NextRequest) {
  try {
    const { produtoSlug, nomeCliente, whatsappCliente, refAfiliado } = await req.json();

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
        whatsappCliente,
        valorPago: produto.precoVenda,
        comissaoValor: afiliado ? (produto.precoVenda * produto.comissaoPorc) / 100 : 0,
        status: "pendente",
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jennifer-ai.vercel.app";

    const preference = await (mp as any).preferences.create({
      body: {
        items: [{
          title: produto.nome,
          quantity: 1,
          currency_id: "BRL",
          unit_price: produto.precoVenda,
        }],
        external_reference: `shop|${venda.id}`,
        notification_url: `${appUrl}/api/shop/webhook`,
        back_urls: {
          success: `${appUrl}/shop/${produtoSlug}?status=sucesso`,
          failure: `${appUrl}/shop/${produtoSlug}?status=falha`,
        },
      },
    });

    return NextResponse.json({
      preferenceId: preference.id,
      vendaId: venda.id,
    });
  } catch (e: any) {
    console.error("[SHOP/CHECKOUT]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
