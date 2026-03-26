import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function gerarSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 50)
    + "-" + Math.random().toString(36).substring(2, 7);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const { nome, destaques, imageLinks, videoUrl, salesLink, preco } = await req.json();

    if (!nome || !destaques || !salesLink || !preco) {
      return NextResponse.json({ erro: "nome, destaques, link de vendas e preço são obrigatórios" }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em copywriting e conversão. Analise o produto e crie uma estrutura de vendas de alto nível. Retorne APENAS JSON válido.`,
        },
        {
          role: "user",
          content: `Produto: ${nome}
Preço: ${preco}
Destaques que o vendedor quer enfatizar: ${destaques}
${videoUrl ? `Tem vídeo demonstrativo: Sim` : "Tem vídeo: Não"}

Crie uma estrutura de vendas com este JSON exato:
{
  "publico": "quem é o público-alvo ideal",
  "proposta": "proposta de valor em 1 frase poderosa e direta",
  "dores": ["dor 1", "dor 2", "dor 3"],
  "beneficios": ["benefício 1", "benefício 2", "benefício 3", "benefício 4"],
  "objecoes": [
    { "objecao": "objeção 1", "rebate": "rebate direto e convincente" },
    { "objecao": "objeção 2", "rebate": "rebate direto e convincente" },
    { "objecao": "objeção 3", "rebate": "rebate direto e convincente" }
  ],
  "cta": "chamada para ação direta e urgente",
  "abertura": "saudação de abertura do Kadosh ao visitante — curta, calorosa, instiga curiosidade (máx 2 frases)",
  "gatilhos": ["escassez ou urgência", "prova social", "autoridade ou garantia"],
  "quando_usar_video": "em que momento exato da conversa o vídeo gera maior impacto",
  "prompt_vendas": "instruções específicas de como o Kadosh deve vender ESTE produto neste nicho — tom, abordagem, o que enfatizar, o que evitar"
}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content?.trim() || "{}";
    let estrutura: any = {};
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      estrutura = JSON.parse(cleaned);
    } catch {
      estrutura = {
        proposta: nome, publico: "", dores: [], beneficios: [], objecoes: [],
        cta: "Quero comprar agora",
        abertura: `Olá! Estou aqui para te apresentar ${nome}. Pode falar comigo!`,
        gatilhos: [], quando_usar_video: "quando o visitante pedir mais detalhes",
        prompt_vendas: `Venda ${nome} com foco nos destaques: ${destaques}`,
      };
    }

    const slug = gerarSlug(nome);

    const produto = await prisma.produtoVendedor.create({
      data: {
        clientId: user.sub,
        slug,
        nome,
        destaques,
        imageLinks: imageLinks || [],
        videoUrl: videoUrl || null,
        salesLink,
        preco,
        estrutura,
      },
    });

    return NextResponse.json({ ok: true, slug: produto.slug });
  } catch (e: any) {
    console.error("[VENDEDOR/CRIAR]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
