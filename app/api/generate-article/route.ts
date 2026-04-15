import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSite } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { siteSlug, tema } = await req.json();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const site = getSite(siteSlug);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Escreva um artigo profissional para um site de ${site?.nicho ?? "negócio"} sobre o tema: "${tema}".

O artigo deve ter:
- Título atrativo e direto
- 4 parágrafos bem escritos e relevantes
- Linguagem acessível e profissional em português brasileiro
- Conteúdo que gere valor para o leitor

Retorne SOMENTE este JSON (sem markdown):
{"titulo":"...","conteudo":"..."}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return NextResponse.json(JSON.parse(match[0]));
  } catch {}
  return NextResponse.json({ titulo: tema, conteudo: text });
}
