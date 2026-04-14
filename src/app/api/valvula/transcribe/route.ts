import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as Blob | null;
    if (!audio) return NextResponse.json({ error: "no audio" }, { status: 400 });

    const file = new File([audio], "audio.webm", { type: audio.type || "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "pt",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (e) {
    console.error("[ValvulaTranscribe]", e);
    return NextResponse.json({ error: "transcription failed" }, { status: 500 });
  }
}
