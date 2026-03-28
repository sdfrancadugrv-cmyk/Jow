import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { texto } = await req.json();
    if (!texto?.trim()) {
      return NextResponse.json({ audio: null });
    }

    const tts = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: texto.substring(0, 4096),
    });

    const buffer = Buffer.from(await tts.arrayBuffer());
    return NextResponse.json({ audio: buffer.toString("base64") });
  } catch (e: any) {
    console.error("[PROFESSOR/TTS]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
