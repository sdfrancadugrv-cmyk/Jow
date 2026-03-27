import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  try {
    const { slug, nome, whatsapp } = await req.json();

    if (!slug || !nome?.trim() || !whatsapp?.trim()) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });
    }

    const produto = await prisma.produtoVendedor.findUnique({
      where: { slug },
      select: { id: true, nome: true },
    });
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // Verifica se esse WhatsApp já é afiliado desse produto
    const existente = await prisma.afiliado.findFirst({
      where: { slug, whatsapp: cleanPhone },
    });
    if (existente) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";
      return NextResponse.json({
        codigo: existente.codigo,
        dashboardLink: `${appUrl}/afiliado/${existente.codigo}`,
        jaExiste: true,
      });
    }

    // Gera código único
    let codigo = gerarCodigo();
    let tentativas = 0;
    while (await prisma.afiliado.findUnique({ where: { codigo } })) {
      codigo = gerarCodigo();
      if (++tentativas > 10) throw new Error("Não foi possível gerar código único");
    }

    const afiliado = await prisma.afiliado.create({
      data: { slug, nome: nome.trim(), whatsapp: cleanPhone, codigo },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";
    return NextResponse.json({
      codigo: afiliado.codigo,
      dashboardLink: `${appUrl}/afiliado/${afiliado.codigo}`,
    });
  } catch (err) {
    console.error("[Afiliado/Registrar]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
