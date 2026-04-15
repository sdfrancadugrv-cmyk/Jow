import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });

  // ElevenLabs primeiro — voz mais natural em PT-BR
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const voiceId = process.env.ELEVENLABS_VOICE_ID || "GOkMqfyKMLVUcYfO2WbB";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          language_code: "pt",
          voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
        }),
      });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        return new NextResponse(buf as unknown as BodyInit, {
          headers: { "Content-Type": "audio/mpeg", "Content-Length": buf.length.toString(), "Cache-Control": "no-store" },
        });
      }
    } catch {}
  }

  // fallback: OpenAI shimmer HD
  const mp3 = await openai.audio.speech.create({ model: "tts-1-hd", voice: "shimmer", input: text, speed: 1.0 });
  const buf = Buffer.from(await mp3.arrayBuffer());
  return new NextResponse(buf as unknown as BodyInit, {
    headers: { "Content-Type": "audio/mpeg", "Content-Length": buf.length.toString(), "Cache-Control": "no-store" },
  });
}
