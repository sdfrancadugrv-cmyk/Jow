import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { codigo, pixKey, valor } = await req.json();

    const afiliado = await prisma.afiliadoShop.findUnique({ where: { codigo } });
    if (!afiliado) return NextResponse.json({ erro: "Afiliado não encontrado" }, { status: 404 });

    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum < 10) return NextResponse.json({ erro: "Valor mínimo de saque: R$ 10,00" }, { status: 400 });
    if (valorNum > afiliado.saldo) return NextResponse.json({ erro: "Saldo insuficiente" }, { status: 400 });
    if (!pixKey) return NextResponse.json({ erro: "Informe a chave PIX" }, { status: 400 });

    await prisma.$transaction([
      prisma.saqueShop.create({ data: { afiliadoId: afiliado.id, valor: valorNum, pixKey } }),
      prisma.afiliadoShop.update({ where: { id: afiliado.id }, data: { saldo: { decrement: valorNum } } }),
    ]);

    // Avisa o dono
    if (process.env.OWNER_PHONE) {
      const msg = `💸 *Solicitação de saque — Jennifer Shop*\n\nAfiliada: ${afiliado.nome}\nWhatsApp: ${afiliado.whatsapp}\nValor: R$ ${valorNum.toFixed(2).replace(".", ",")}\nChave PIX: ${pixKey}\n\nFaça o pagamento e confirme no painel.`;
      await fetch(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": process.env.ZAPI_CLIENT_TOKEN! },
        body: JSON.stringify({ phone: process.env.OWNER_PHONE, message: msg }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[REVENDEDOR/SAQUE]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
