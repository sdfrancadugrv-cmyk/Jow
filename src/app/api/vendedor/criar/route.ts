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
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `Você é um dos maiores especialistas em copywriting e páginas de vendas de alta conversão do Brasil. Você conhece as páginas virais de Pablo Marçal, Erico Rocha, Primo Rico, Hotmart top sellers. Analise o produto e crie uma estrutura de vendas de alto impacto. Retorne APENAS JSON válido, sem markdown.`,
        },
        {
          role: "user",
          content: `Produto: ${nome}
Preço: ${preco}
Destaques que o vendedor quer enfatizar: ${destaques}
${videoUrl ? "Tem vídeo demonstrativo: Sim" : "Tem vídeo: Não"}

Crie uma estrutura de vendas completa com este JSON exato:
{
  "tema": {
    "cor_primaria": "#hex da cor principal que representa esse produto/nicho — use cores reais que combinam com o produto",
    "cor_acento": "#hex da cor de destaque para CTAs e destaques — deve contrastar bem com cor_primaria",
    "estilo": "urgente|premium|energetico|confianca — escolha baseado no nicho do produto",
    "emoji": "emoji que representa o produto/nicho"
  },
  "headline": "headline de ALTO IMPACTO — específica, provoca emoção, tem resultado concreto ou número se possível, máx 12 palavras",
  "subheadline": "frase que aprofunda a promise e cria desejo, máx 20 palavras",
  "transformacao": "De [estado atual doloroso] para [resultado desejado] — frase de transformação real e emocional",
  "prova_social": "gancho de prova social com número específico e resultado — ex: '+2.847 pessoas já mudaram X com isso'",
  "urgencia": "copy de urgência ou escassez emocional — não use escassez falsa, use custo da inação ou janela de oportunidade",
  "publico": "quem é o público-alvo ideal — seja específico",
  "proposta": "proposta de valor em 1 frase poderosa e direta",
  "dores": ["dor emocional 1 — seja específico e visceral", "dor 2", "dor 3", "dor 4"],
  "beneficios": ["benefício concreto com resultado 1", "benefício 2", "benefício 3", "benefício 4", "benefício 5"],
  "objecoes": [
    { "objecao": "objeção 1 real que esse público tem", "rebate": "rebate emocional e direto, não corporativo" },
    { "objecao": "objeção 2", "rebate": "rebate 2" },
    { "objecao": "objeção 3", "rebate": "rebate 3" }
  ],
  "cta": "chamada para ação direta, urgente e específica — máx 5 palavras",
  "abertura": "primeira fala do Kadosh ao visitante — energia alta, provoca curiosidade, cria conexão imediata, máx 2 frases",
  "gatilhos": ["gatilho de escassez/urgência específico", "gatilho de prova social com dado", "gatilho de autoridade ou garantia"],
  "quando_usar_video": "momento exato da conversa onde o vídeo gera o maior impacto emocional",
  "prompt_vendas": "instruções detalhadas de como o Kadosh deve vender ESTE produto: tom exato, abordagem, histórias que pode contar, o que enfatizar, o que nunca dizer, técnicas específicas para esse nicho"
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
        tema: { cor_primaria: "#D4A017", cor_acento: "#E8B020", estilo: "premium", emoji: "⚡" },
        headline: nome,
        subheadline: destaques,
        transformacao: "",
        prova_social: "",
        urgencia: "",
        proposta: destaques,
        publico: "",
        dores: [],
        beneficios: [],
        objecoes: [],
        cta: "Quero agora",
        abertura: `Você chegou na hora certa. Esse produto pode mudar o que você tá buscando — deixa eu te contar por quê.`,
        gatilhos: [],
        quando_usar_video: "quando o visitante pedir mais detalhes",
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
