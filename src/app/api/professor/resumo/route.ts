import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { mensagens } = await req.json();

    if (!mensagens || mensagens.length < 2) {
      return NextResponse.json({ erro: "Conversa muito curta para resumir." }, { status: 400 });
    }

    const conversa = mensagens
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Aluno" : "Professor"}: ${m.content}`
      )
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2000,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content: `Você é um assistente especializado em criar resumos de estudo.
Analise a aula abaixo e crie um resumo estruturado para o aluno estudar.
Use linguagem clara e direta. Não use asteriscos ou markdown — use apenas texto simples com títulos em MAIÚSCULAS.`,
        },
        {
          role: "user",
          content: `Aqui está a transcrição da aula:

${conversa}

Crie um RESUMO DE ESTUDO com as seguintes seções:

TEMA DA AULA
(em uma linha, o assunto principal)

CONCEITOS PRINCIPAIS
(liste os principais conceitos ensinados, um por linha)

PONTOS MAIS IMPORTANTES
(os 3 a 5 pontos que o aluno não pode esquecer)

O QUE ESTUDAR PARA A PROVA
(tópicos que provavelmente cairão em uma prova sobre esse assunto)

DICAS DO PROFESSOR
(conselhos ou observações importantes feitas durante a aula)`,
        },
      ],
    });

    const resumo = completion.choices[0].message.content || "";
    return NextResponse.json({ resumo });
  } catch (e: any) {
    console.error("[PROFESSOR/RESUMO]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
