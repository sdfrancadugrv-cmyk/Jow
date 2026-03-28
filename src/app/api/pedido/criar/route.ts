import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp-send";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const { slug, nome, telefone, endereco, afiliadoId, opcaoNome, comissao, valorOpcao } = await req.json();

    if (!slug || !nome?.trim() || !telefone?.trim() || !endereco?.trim()) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios" }, { status: 400 });
    }

    const produto = await prisma.produtoVendedor.findUnique({
      where: { slug },
      select: { nome: true, preco: true, pixKey: true, whatsappContato: true },
    });
    if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

    const cleanPhone = telefone.replace(/\D/g, "");

    const pedido = await (prisma.pedidoInstalacao.create as any)({
      data: {
        produtoSlug: slug,
        nome: nome.trim(),
        telefone: cleanPhone,
        endereco: endereco.trim(),
        valor: valorOpcao || produto.preco,
        opcaoNome: opcaoNome || null,
        comissao: comissao || 0,
        status: "aguardando",
        afiliadoId: afiliadoId || null,
      },
    });

    // Avisa o dono
    const ownerPhone = process.env.OWNER_PHONE;
    if (ownerPhone) {
      await sendWhatsApp(
        ownerPhone,
        `🔔 *NOVO PEDIDO DE INSTALAÇÃO!*\n\n` +
        `Produto: *${produto.nome}*\n` +
        (opcaoNome ? `Opção: *${opcaoNome}*\n` : "") +
        `Cliente: *${nome.trim()}*\n` +
        `Telefone: ${cleanPhone}\n` +
        `Endereço: ${endereco.trim()}\n` +
        `Valor: *${valorOpcao || produto.preco}*\n` +
        (comissao ? `Comissão revendedor: R$ ${Number(comissao).toFixed(2).replace(".", ",")}\n` : "") +
        `Pedido #${pedido.id.slice(-6).toUpperCase()}\n` +
        `Painel: ${APP_URL}/admin/pedidos`
      );
    }

    // Avisa o afiliado se veio via link
    if (afiliadoId) {
      const afiliado = await prisma.afiliado.findUnique({
        where: { id: afiliadoId },
        select: { whatsapp: true, nome: true },
      });
      if (afiliado?.whatsapp) {
        await sendWhatsApp(
          afiliado.whatsapp,
          `📦 *Novo pedido pelo seu link!*\n\n` +
          `Cliente: ${nome.trim()}\n` +
          `Produto: ${produto.nome}\n` +
          `Valor: ${produto.preco}\n\n` +
          `Aguarde a confirmação do pagamento para sua comissão ser liberada.`
        );
      }
    }

    return NextResponse.json({
      pedidoId: pedido.id,
      pixKey: produto.pixKey || null,
      valor: produto.preco,
      nomeProduto: produto.nome,
    });
  } catch (err) {
    console.error("[Pedido/Criar]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
