import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { slug, mensagens, videoAssistido } = await req.json();
    if (!slug || !mensagens) return NextResponse.json({ erro: "dados inválidos" }, { status: 400 });

    const produto = await prisma.produtoVendedor.findUnique({ where: { slug } });
    if (!produto) return NextResponse.json({ erro: "produto não encontrado" }, { status: 404 });

    const e = produto.estrutura as any;
    const temVideo = !!produto.videoUrl;

    const systemPrompt = `Você é o Kadosh Vendedor, um especialista em vendas consultivas para o produto abaixo.
Seu objetivo é entender o visitante, apresentar o produto de forma natural, rebater objeções com inteligência e conduzir à compra.

PRODUTO: ${produto.nome}
DESCRIÇÃO: ${produto.descricao}
PÚBLICO-ALVO: ${e.publico || ""}
PROPOSTA DE VALOR: ${e.proposta || ""}
DORES QUE RESOLVE: ${(e.dores || []).join(", ")}
BENEFÍCIOS: ${(e.beneficios || []).join(", ")}
GATILHOS: ${(e.gatilhos || []).join(", ")}
PREÇO SUGERIDO: ${e.preco_sugerido || ""}
CTA: ${e.cta || "Quero comprar"}

OBJEÇÕES E REBATES:
${(e.objecoes || []).map((o: any) => `- "${o.objecao}" → ${o.rebate}`).join("\n")}

${temVideo ? `VÍDEO DISPONÍVEL: Sim
QUANDO USAR O VÍDEO: ${e.quando_usar_video || "quando o visitante demonstrar interesse ou tiver uma objeção visual"}
${videoAssistido ? "O visitante JÁ assistiu ao vídeo. Pergunte o que achou e avance para o fechamento." : "O visitante AINDA NÃO assistiu ao vídeo. Use-o no momento certo."}` : ""}

REGRAS:
- Responda sempre em português, de forma natural e consultiva
- Nunca seja agressivo ou pressione demais
- Seja conciso: máximo 3 frases por resposta
- Quando for o momento certo de mostrar o vídeo (objeção visual, querer ver funcionando, momento de impacto), retorne "REPRODUZIR_VIDEO" no campo "acao"
- Só use o vídeo UMA VEZ por conversa
- Responda em JSON: { "resposta": "sua mensagem", "acao": null }
- Se for hora do vídeo: { "resposta": "sua mensagem curta antes do vídeo", "acao": "REPRODUZIR_VIDEO" }
- Se quiser capturar o WhatsApp para follow-up: { "resposta": "sua mensagem", "acao": "PEDIR_WHATSAPP" }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...mensagens,
      ],
    });

    const raw = completion.choices[0].message.content?.trim() || "{}";
    let resultado: any = {};
    try { resultado = JSON.parse(raw); } catch { resultado = { resposta: "Desculpe, pode repetir?", acao: null }; }

    return NextResponse.json({
      resposta: resultado.resposta || "",
      acao: resultado.acao || null,
    });
  } catch (e: any) {
    console.error("[VENDEDOR/CHAT]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
