import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp-send";

export async function POST(req: NextRequest, { params }: { params: { codigo: string } }) {
  try {
    const { pixKey } = await req.json();

    if (!pixKey?.trim()) {
      return NextResponse.json({ error: "Chave PIX obrigatória" }, { status: 400 });
    }

    const afiliado = await prisma.afiliado.findUnique({ where: { codigo: params.codigo } });
    if (!afiliado) {
      return NextResponse.json({ error: "Afiliado não encontrado" }, { status: 404 });
    }

    if (afiliado.saldo < 1) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    const valorSaque = afiliado.saldo;

    // Registra o saque e zera o saldo
    await prisma.$transaction([
      prisma.saqueAfiliado.create({
        data: {
          afiliadoId: afiliado.id,
          valor: valorSaque,
          pixKey: pixKey.trim(),
          status: "pendente",
        },
      }),
      prisma.afiliado.update({
        where: { id: afiliado.id },
        data: { saldo: 0 },
      }),
    ]);

    // Notifica o admin via WhatsApp
    const ownerPhone = process.env.OWNER_PHONE;
    if (ownerPhone) {
      await sendWhatsApp(
        ownerPhone,
        `💸 *SOLICITAÇÃO DE SAQUE*\n\n` +
        `Revendedor: *${afiliado.nome}*\n` +
        `WhatsApp: ${afiliado.whatsapp}\n` +
        `Valor: *R$ ${valorSaque.toFixed(2).replace(".", ",")}*\n` +
        `Chave PIX: *${pixKey.trim()}*\n\n` +
        `Faça a transferência e confirme o pagamento.`
      );
    }

    // Notifica o afiliado
    await sendWhatsApp(
      afiliado.whatsapp,
      `✅ *Saque solicitado com sucesso!*\n\n` +
      `Valor: *R$ ${valorSaque.toFixed(2).replace(".", ",")}*\n` +
      `Chave PIX: ${pixKey.trim()}\n\n` +
      `Você receberá o pagamento em até *24 horas*.`
    );

    return NextResponse.json({ ok: true, valor: valorSaque });
  } catch (err) {
    console.error("[Afiliado/Saque]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
