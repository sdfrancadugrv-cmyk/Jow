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

    const { nome, descricao, videoUrl } = await req.json();
    if (!nome || !descricao) return NextResponse.json({ erro: "nome e descrição são obrigatórios" }, { status: 400 });

    // Gera estrutura de vendas com GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em copywriting e vendas. Analise o produto e crie uma estrutura de vendas completa em JSON.
Retorne APENAS JSON válido, sem markdown, sem explicações.`,
        },
        {
          role: "user",
          content: `Produto: ${nome}\nDescrição: ${descricao}\n\nCrie uma estrutura de vendas com este formato JSON:
{
  "publico": "descrição do público-alvo ideal",
  "proposta": "proposta de valor em 1 frase impactante",
  "dores": ["dor 1", "dor 2", "dor 3"],
  "beneficios": ["benefício 1", "benefício 2", "benefício 3", "benefício 4"],
  "objecoes": [
    { "objecao": "objeção comum 1", "rebate": "como rebater" },
    { "objecao": "objeção comum 2", "rebate": "como rebater" },
    { "objecao": "objeção comum 3", "rebate": "como rebater" }
  ],
  "preco_sugerido": "sugestão de preço ou faixa",
  "cta": "chamada para ação principal",
  "abertura": "mensagem de abertura do Kadosh Vendedor para o visitante (2-3 frases, tom consultivo)",
  "gatilhos": ["gatilho mental 1", "gatilho mental 2", "gatilho mental 3"],
  "quando_usar_video": "descreva em que momento da conversa o vídeo deve ser exibido para maior impacto"
}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content?.trim() || "{}";
    let estrutura: any = {};
    try { estrutura = JSON.parse(raw); } catch { estrutura = { proposta: nome, publico: "", dores: [], beneficios: [], objecoes: [], cta: "Quero saber mais", abertura: `Olá! Estou aqui para te apresentar ${nome}. Como posso ajudar?`, gatilhos: [], quando_usar_video: "quando o visitante demonstrar interesse" }; }

    const slug = gerarSlug(nome);

    const produto = await prisma.produtoVendedor.create({
      data: {
        clientId: user.sub,
        slug,
        nome,
        descricao,
        videoUrl: videoUrl || null,
        estrutura,
      },
    });

    return NextResponse.json({ ok: true, slug: produto.slug, id: produto.id });
  } catch (e: any) {
    console.error("[VENDEDOR/CRIAR]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
