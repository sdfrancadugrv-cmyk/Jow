import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é KADOSH, um orquestrador de IA pessoal controlado por voz.
Você está na página inicial apresentando o produto a visitantes que ainda não compraram.

PRODUTO KADOSH:
- Assistente de IA pessoal com comando de voz — fala como com um humano
- Memória permanente — lembra de tudo que foi conversado, cada sessão continua de onde parou
- 300+ agentes especializados trabalhando em paralelo: Dev, Analista, Arquiteto, QA, UX e mais
- Pesquisa na internet em tempo real sem você precisar pedir
- Preço: R$97 por mês — cancele quando quiser, sem fidelidade, sem contrato

INSTRUÇÕES:
- Responda de forma CURTA e impactante (máximo 2 frases curtas — isso é uma resposta de voz)
- Seja empolgado, confiante e direto
- Fale em português brasileiro informal
- Se a pessoa quiser assinar, testar, começar, contratar ou comprar: termine com [ASSINAR]
- Se a pessoa já tem conta e quer entrar, fazer login ou acessar: termine com [LOGIN]
- Se a pessoa pedir para falar com humano, parar ou encerrar: termine com [FECHAR]
- NUNCA mencione as tags [ASSINAR] [LOGIN] [FECHAR] na fala — são instruções invisíveis no final
- Na primeira mensagem se apresente brevemente e pergunte como pode ajudar`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.slice(-8),
      { role: "user" as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 120,
      temperature: 0.85,
    });

    const raw = completion.choices[0].message.content || "";

    let action: string | null = null;
    let text = raw.trim();

    if (text.includes("[ASSINAR]")) {
      action = "goto_register";
      text = text.replace("[ASSINAR]", "").trim();
    } else if (text.includes("[LOGIN]")) {
      action = "goto_login";
      text = text.replace("[LOGIN]", "").trim();
    } else if (text.includes("[FECHAR]")) {
      action = "close";
      text = text.replace("[FECHAR]", "").trim();
    }

    return NextResponse.json({ text, action });
  } catch (e) {
    console.error("landing-chat error:", e);
    return NextResponse.json({ text: "Oi! Sou o KADOSH, seu orquestrador de IA. Como posso te ajudar?", action: null });
  }
}
