import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function enviarPixAsaas(pixKey: string, valor: number, descricao: string): Promise<{ ok: boolean; erro?: string }> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return { ok: false, erro: "ASAAS_API_KEY não configurada" };

  const baseUrl = process.env.ASAAS_ENV === "sandbox"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";

  // Detecta tipo da chave PIX
  let pixAddressKeyType = "EVP"; // chave aleatória (default)
  if (/^\d{11}$/.test(pixKey.replace(/\D/g, ""))) pixAddressKeyType = "CPF";
  else if (/^\d{14}$/.test(pixKey.replace(/\D/g, ""))) pixAddressKeyType = "CNPJ";
  else if (/^\+?\d{10,15}$/.test(pixKey.replace(/[\s\-]/g, ""))) pixAddressKeyType = "PHONE";
  else if (/@/.test(pixKey)) pixAddressKeyType = "EMAIL";

  const res = await fetch(`${baseUrl}/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey,
    },
    body: JSON.stringify({
      value: valor,
      pixAddressKey: pixKey,
      pixAddressKeyType,
      description: descricao,
      operationType: "PIX",
    }),
  });

  const data = await res.json();
  if (!res.ok) return { ok: false, erro: data?.errors?.[0]?.description || "Erro ao enviar PIX" };
  return { ok: true };
}

export async function POST(req: NextRequest) {
  try {
    const { codigo, pixKey, valor } = await req.json();

    const afiliado = await prisma.afiliadoShop.findUnique({ where: { codigo } });
    if (!afiliado) return NextResponse.json({ erro: "Afiliado não encontrado" }, { status: 404 });

    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum < 10) return NextResponse.json({ erro: "Valor mínimo de saque: R$ 10,00" }, { status: 400 });
    if (valorNum > afiliado.saldo) return NextResponse.json({ erro: "Saldo insuficiente" }, { status: 400 });
    if (!pixKey) return NextResponse.json({ erro: "Informe a chave PIX" }, { status: 400 });

    // Tenta enviar PIX automático via Asaas
    const resultado = await enviarPixAsaas(
      pixKey,
      valorNum,
      `Comissão Jennifer Shop — ${afiliado.nome}`
    );

    if (!resultado.ok) {
      return NextResponse.json({ erro: `Falha ao enviar PIX: ${resultado.erro}` }, { status: 500 });
    }

    // Registra o saque e debita saldo
    await prisma.$transaction([
      prisma.saqueShop.create({ data: { afiliadoId: afiliado.id, valor: valorNum, pixKey, status: "pago" } }),
      prisma.afiliadoShop.update({ where: { id: afiliado.id }, data: { saldo: { decrement: valorNum } } }),
    ]);

    // Avisa a revendedora por WhatsApp
    if (afiliado.whatsapp) {
      const msg = `✅ *Jennifer Shop* — PIX enviado!\n\nOlá ${afiliado.nome.split(" ")[0]}! Seu saque de R$ ${valorNum.toFixed(2).replace(".", ",")} foi enviado para a chave PIX ${pixKey}.\n\nObrigada por revender com a gente! 💚`;
      await fetch(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": process.env.ZAPI_CLIENT_TOKEN! },
        body: JSON.stringify({ phone: afiliado.whatsapp, message: msg }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[REVENDEDOR/SAQUE]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
