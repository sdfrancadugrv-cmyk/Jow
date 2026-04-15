import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });

    // tenta ElevenLabs primeiro (voz mais natural em PT-BR)
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
          method: "POST",
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.45, similarity_boost: 0.80 },
          }),
        });
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          return new NextResponse(buf as unknown as BodyInit, {
            headers: { "Content-Type": "audio/mpeg", "Content-Length": buf.length.toString(), "Cache-Control": "no-store", "X-Voice-Provider": "elevenlabs" },
          });
        }
      } catch {}
    }

    // OpenAI shimmer HD — voz mais quente e humanizada
    const mp3 = await openai.audio.speech.create({ model: "tts-1-hd", voice: "shimmer", input: text, speed: 1.0 });
    const buf = Buffer.from(await mp3.arrayBuffer());

    return new NextResponse(buf as unknown as BodyInit, {
      headers: { "Content-Type": "audio/mpeg", "Content-Length": buf.length.toString(), "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[ValvulaSpeak]", e);
    return NextResponse.json({ error: "tts failed" }, { status: 500 });
  }
}
