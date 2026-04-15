import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { description, pricePerHour } = await req.json();
  const hourlyRate = pricePerHour || 150;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Crie uma proposta comercial para: "${description}". Valor hora: R$ ${hourlyRate}.

Retorne APENAS JSON válido:
{"title":"título","items":["item1","item2"],"hours":número,"deadline":"X dias úteis","price":"R$ X.XXX","message":"resumo em 2 linhas"}

Calcule preço = horas × R$ ${hourlyRate}.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch {}

  return NextResponse.json({ error: "Erro ao processar proposta" }, { status: 500 });
}
