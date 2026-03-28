import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function gerarCodigo(nome: string): string {
  const base = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "").substring(0, 6);
  const rand = Math.random().toString(36).substring(2, 6);
  return `${base}${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const { nome, whatsapp, email } = await req.json();

    if (!nome || !whatsapp) {
      return NextResponse.json({ erro: "Nome e WhatsApp são obrigatórios." }, { status: 400 });
    }

    const telefone = whatsapp.replace(/\D/g, "");

    // Verifica se já existe
    const existente = await prisma.afiliadoShop.findFirst({ where: { whatsapp: telefone } });
    if (existente) {
      return NextResponse.json({ afiliado: existente });
    }

    let codigo = gerarCodigo(nome);
    while (await prisma.afiliadoShop.findUnique({ where: { codigo } })) {
      codigo = gerarCodigo(nome);
    }

    const afiliado = await prisma.afiliadoShop.create({
      data: { nome, whatsapp: telefone, email: email || null, codigo },
    });

    // Avisa no WhatsApp
    const msg = `🎉 *Bem-vinda à Jennifer Shop!*\n\nOlá ${nome}! Seu cadastro como revendedora foi aprovado.\n\nSeu link de afiliada:\n👉 ${process.env.NEXT_PUBLIC_APP_URL}/shop?ref=${codigo}\n\nDivulgue esse link e ganhe comissão automática a cada venda. A Jennifer faz a venda por você!\n\nAcesse seu painel:\n${process.env.NEXT_PUBLIC_APP_URL}/revendedor/painel?codigo=${codigo}`;

    await fetch(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": process.env.ZAPI_CLIENT_TOKEN! },
      body: JSON.stringify({ phone: `55${telefone}`, message: msg }),
    }).catch(() => {});

    return NextResponse.json({ afiliado });
  } catch (e: any) {
    console.error("[REVENDEDOR/CADASTRO]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
