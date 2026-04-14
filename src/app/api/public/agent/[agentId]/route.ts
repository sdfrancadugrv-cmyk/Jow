export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Permite chamadas do widget embutido em qualquer site
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const agent = await prisma.whatsappAgent.findUnique({
      where: { id: params.agentId },
      select: { id: true, personality: true, name: true, phone: true, active: true },
    });

    if (!agent || !agent.active) {
      return NextResponse.json({ error: "Agente não encontrado" }, { status: 404, headers: corsHeaders });
    }

    const contentType = req.headers.get("content-type") || "";
    let userText = "";
    let messages: { role: "user" | "assistant"; content: string }[] = [];

    if (contentType.includes("multipart/form-data")) {
      // Áudio enviado pelo widget
      const form = await req.formData();
      const audioFile = form.get("audio") as File;
      const messagesRaw = form.get("messages") as string;

      if (messagesRaw) {
        try { messages = JSON.parse(messagesRaw); } catch {}
      }

      if (audioFile) {
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: "pt",
        });
        userText = transcription.text;
      }
    } else {
      // Texto direto
      const body = await req.json();
      userText = body.message || "";
      messages = body.messages || [];
    }

    if (!userText.trim()) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400, headers: corsHeaders });
    }

    // Gera resposta com GPT-4o usando a personalidade do agente
    const updatedMessages = [...messages, { role: "user" as const, content: userText }];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `${agent.personality}\n\nREGRAS:\n- Responda em português brasileiro\n- Seja conciso (máximo 3 frases) pois a resposta será lida em voz alta\n- Nunca use placeholders como [nome] ou similares\n- Conduza o cliente para uma ação concreta (agendar, comprar, contato)`,
        },
        ...updatedMessages.slice(-10),
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? "Desculpe, pode repetir?";

    // Gera áudio da resposta
    let audioBase64 = "";
    try {
      const voice = (process.env.TTS_VOICE as any) ?? "nova";
      const audio = await openai.audio.speech.create({
        model: "tts-1",
        voice,
        input: responseText,
        response_format: "mp3",
      });
      const buffer = Buffer.from(await audio.arrayBuffer());
      audioBase64 = buffer.toString("base64");
    } catch {}

    return NextResponse.json(
      {
        message: responseText,
        userMessage: userText,
        audio: audioBase64 ? `data:audio/mp3;base64,${audioBase64}` : null,
        messages: [...updatedMessages, { role: "assistant", content: responseText }],
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error("[Public Agent]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500, headers: corsHeaders });
  }
}
