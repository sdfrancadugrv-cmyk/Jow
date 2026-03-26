export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Texto não fornecido" }, { status: 400 });
    }

    const voice = (process.env.TTS_VOICE as "onyx" | "alloy" | "echo" | "fable" | "nova" | "shimmer") ?? "nova";

    const audio = await openai.audio.speech.create({
      model: "tts-1",
      voice,
      input: text,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await audio.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Erro no TTS:", error);
    return NextResponse.json({ error: "Falha na síntese de voz" }, { status: 500 });
  }
}
