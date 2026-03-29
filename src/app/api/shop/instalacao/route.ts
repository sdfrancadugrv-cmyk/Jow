import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Cidades aceitas — Pelotas RS e região
const CIDADES_ACEITAS = [
  "pelotas", "rio grande", "capão do leão", "arroio do padre", "morro redondo",
  "turuçu", "são lourenço do sul", "canguçu", "cristal", "são josé do norte",
  "herval", "pedras altas", "candiota", "hulha negra",
];

function cidadeAceita(cidade: string): boolean {
  const c = cidade.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CIDADES_ACEITAS.some(aceita => {
    const a = aceita.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return c === a || c.includes(a);
  });
}

export async function POST(req: NextRequest) {
  try {
    const { produtoSlug, nome, telefone, cep, cidade, estado, endereco } = await req.json();

    if (!produtoSlug || !nome || !telefone || !cidade || !estado) {
      return NextResponse.json({ erro: "Preencha todos os campos obrigatórios." }, { status: 400 });
    }

    // Valida região
    if (estado.toLowerCase() !== "rs" || !cidadeAceita(cidade)) {
      return NextResponse.json({
        erro: `Desculpe, o serviço de instalação está disponível apenas em Pelotas e região (RS). ${cidade} não está na área de atendimento.`,
        foraDaArea: true,
      }, { status: 400 });
    }

    const produto = await prisma.produtoShop.findUnique({ where: { slug: produtoSlug } });
    if (!produto) return NextResponse.json({ erro: "Produto não encontrado." }, { status: 404 });

    const solicitacao = await prisma.solicitacaoInstalacao.create({
      data: { produtoId: produto.id, nome, telefone, cep: cep || "", cidade, estado, endereco: endereco || "" },
    });

    // Notifica via WhatsApp
    const msg = `🔧 *Nova Solicitação de Instalação*\n\n📦 Produto: ${produto.nome}\n👤 Nome: ${nome}\n📱 Telefone: ${telefone}\n📍 ${cidade}/${estado}${endereco ? `\n🏠 ${endereco}` : ""}\n${cep ? `📮 CEP: ${cep}` : ""}\n\n_Responda ao cliente para confirmar a instalação._`;

    const zapiInstance = process.env.ZAPI_INSTANCE_ID;
    const zapiToken = process.env.ZAPI_TOKEN;
    const zapiClientToken = process.env.ZAPI_CLIENT_TOKEN;
    const adminWhats = process.env.ADMIN_WHATSAPP; // seu número

    if (zapiInstance && zapiToken && adminWhats) {
      await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": zapiClientToken || "" },
        body: JSON.stringify({ phone: adminWhats, message: msg }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, id: solicitacao.id });
  } catch (e: any) {
    console.error("[INSTALACAO]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
