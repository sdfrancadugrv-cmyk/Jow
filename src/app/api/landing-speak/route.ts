import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function elevenLabs(text: string): Promise<Buffer> {
  const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL", {
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
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "no text" }, { status: 400 });

    let buffer: Buffer;

    if (process.env.ELEVENLABS_API_KEY) {
      try {
        buffer = await elevenLabs(text);
      } catch {
        const mp3 = await openai.audio.speech.create({ model: "tts-1-hd", voice: "nova", input: text, speed: 1.0 });
        buffer = Buffer.from(await mp3.arrayBuffer());
      }
    } else {
      const mp3 = await openai.audio.speech.create({ model: "tts-1-hd", voice: "nova", input: text, speed: 1.0 });
      buffer = Buffer.from(await mp3.arrayBuffer());
    }

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("landing-speak error:", e);
    return NextResponse.json({ error: "tts failed" }, { status: 500 });
  }
}
