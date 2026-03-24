import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { SERVICE_LABELS } from "@/lib/service-types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { description, serviceType } = await req.json();
    if (!description?.trim()) return NextResponse.json({ formatted: description });

    const serviceLabel = SERVICE_LABELS[serviceType] || serviceType;

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de triagem de serviços. Reescreva a descrição do cliente de forma clara e objetiva em 2 a 3 frases, para que o prestador de serviço entenda exatamente o que é necessário. Mantenha todas as informações importantes, organize tecnicamente, não invente nada. Responda apenas com a descrição reformulada, sem introduções.`,
        },
        {
          role: "user",
          content: `Serviço: ${serviceLabel}\nDescrição do cliente: ${description}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const formatted = result.choices[0].message.content?.trim() || description;
    return NextResponse.json({ formatted });
  } catch {
    return NextResponse.json({ formatted: "" }, { status: 500 });
  }
}
