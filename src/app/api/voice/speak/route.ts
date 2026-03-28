export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function ttsElevenLabs(text: string): Promise<Buffer> {
  const voiceId = "EXAVITQu4vr4xnSDxMaL"; // Bella — ElevenLabs
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function ttsOpenAI(text: string): Promise<Buffer> {
  const voice = (process.env.TTS_VOICE as "onyx" | "alloy" | "echo" | "fable" | "nova" | "shimmer") ?? "nova";
  const audio = await openai.audio.speech.create({ model: "tts-1-hd", voice, input: text, response_format: "mp3" });
  return Buffer.from(await audio.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Texto não fornecido" }, { status: 400 });
    }

    let buffer: Buffer;

    if (process.env.ELEVENLABS_API_KEY) {
      try {
        buffer = await ttsElevenLabs(text);
      } catch (e) {
        console.warn("[TTS] ElevenLabs falhou, usando OpenAI:", e);
        buffer = await ttsOpenAI(text);
      }
    } else {
      buffer = await ttsOpenAI(text);
    }

    return new NextResponse(buffer as unknown as BodyInit, {
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
