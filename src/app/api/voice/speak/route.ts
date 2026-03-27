export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function ttsElevenLabs(text: string): Promise<Buffer> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID!;
  const apiKey  = process.env.ELEVENLABS_API_KEY!;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[ElevenLabs] status=${res.status} body=${err}`);
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function ttsOpenAI(text: string): Promise<Buffer> {
  const voice = (process.env.TTS_VOICE as "onyx" | "alloy" | "echo" | "fable" | "nova" | "shimmer") ?? "onyx";
  const audio = await openai.audio.speech.create({ model: "tts-1", voice, input: text, response_format: "mp3" });
  return Buffer.from(await audio.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "Texto não fornecido" }, { status: 400 });

    let buffer: Buffer;

    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID) {
      console.log("[TTS] Usando ElevenLabs, voice:", process.env.ELEVENLABS_VOICE_ID);
      try {
        buffer = await ttsElevenLabs(text);
        console.log("[TTS] ElevenLabs OK");
      } catch (e) {
        console.warn("[TTS] ElevenLabs falhou, usando OpenAI:", e);
        buffer = await ttsOpenAI(text);
      }
    } else {
      console.log("[TTS] ElevenLabs não configurado, usando OpenAI");
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
