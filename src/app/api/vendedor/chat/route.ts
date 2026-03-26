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
    const totalMensagens = mensagens.length;

    const systemPrompt = `${e.prompt_vendas || "Você é um especialista em vendas consultivas de alto nível."}

PRODUTO: ${produto.nome}
PREÇO: ${produto.preco}
DESTAQUES DO VENDEDOR: ${produto.destaques}
PROPOSTA DE VALOR: ${e.proposta || ""}
PÚBLICO-ALVO: ${e.publico || ""}
DORES QUE RESOLVE: ${(e.dores || []).join(" | ")}
BENEFÍCIOS: ${(e.beneficios || []).join(" | ")}
GATILHOS: ${(e.gatilhos || []).join(" | ")}
LINK DE COMPRA: ${produto.salesLink}

OBJEÇÕES E REBATES:
${(e.objecoes || []).map((o: any) => `"${o.objecao}" → ${o.rebate}`).join("\n")}

${temVideo ? `VÍDEO DISPONÍVEL: Sim. Quando usar: ${e.quando_usar_video}
${videoAssistido ? "Visitante JÁ assistiu ao vídeo — avance para o fechamento." : "Visitante ainda NÃO assistiu — use no momento certo."}` : ""}

REGRAS DE OURO:
- Você fala por VOZ — seja natural, humano, conciso. Máximo 2-3 frases por resposta.
- Primeiro qualifique: entenda o que o visitante busca antes de vender
- Adapte a apresentação ao perfil que o visitante revelar
- Rebata objeções com histórias ou dados, nunca com pressão
- Após ${Math.max(4, Math.floor(totalMensagens / 2))} trocas sem fechar: peça o WhatsApp para follow-up
- Se o visitante demonstrar interesse alto: vá direto para o CTA

AÇÕES DISPONÍVEIS (retorne no campo "acao"):
- null → resposta normal
- "REPRODUZIR_VIDEO" → tocar o vídeo agora (use apenas 1x por conversa)
- "PEDIR_WHATSAPP" → pedir WhatsApp para follow-up
- "IR_PARA_COMPRA" → direcionar para o link de compra

Retorne JSON: { "resposta": "sua fala aqui", "acao": null }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.75,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        ...mensagens.slice(-12),
      ],
    });

    const raw = completion.choices[0].message.content?.trim() || "{}";
    let resultado: any = {};
    try { resultado = JSON.parse(raw); } catch { resultado = { resposta: "Pode repetir?", acao: null }; }

    return NextResponse.json({ resposta: resultado.resposta || "", acao: resultado.acao || null });
  } catch (e: any) {
    console.error("[VENDEDOR/CHAT]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
