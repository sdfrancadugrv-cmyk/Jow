import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSite } from "@/lib/store";

export async function POST(req: NextRequest) {
  const { messages, siteSlug } = await req.json();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const site = getSite(siteSlug);
  const promptBase =
    site?.prompt_voz ||
    "Você é um assistente virtual deste estabelecimento. Responda perguntas sobre produtos e serviços de forma cordial e prestativa.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `${promptBase}\n\nResponda em português brasileiro. Seja conciso (máximo 2 frases), pois a resposta será lida em voz alta.`,
      },
      ...messages,
    ],
  });

  const message = response.choices[0]?.message?.content ?? "Desculpe, não entendi. Pode repetir?";
  return NextResponse.json({ message });
}
