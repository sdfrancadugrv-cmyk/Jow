export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ZAPI_BASE = "https://api.z-api.io/instances";

async function downloadMedia(url: string): Promise<Buffer> {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

async function sendText(instanceId: string, token: string, phone: string, text: string) {
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, message: text }),
  });
}

async function sendAudio(instanceId: string, token: string, phone: string, audioBase64: string) {
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/send-audio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, audio: audioBase64, delay: 1000 }),
  });
}

async function generateAudio(text: string): Promise<string> {
  const audio = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: text,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await audio.arrayBuffer());
  return buffer.toString("base64");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Ignora mensagens enviadas pelo próprio bot
    if (body.fromMe) return NextResponse.json({ ok: true });

    const instanceId = body.instanceId as string;
    const phone = (body.phone || body.from) as string;
    const messageType = body.type as string; // text | image | audio | video | document

    // Busca o agente pelo instanceId
    const agent = await prisma.whatsappAgent.findFirst({
      where: { instanceId, active: true },
    });

    if (!agent) return NextResponse.json({ ok: true });

    // Busca ou cria conversa com esse contato
    let convo = await prisma.whatsappConversation.findUnique({
      where: { agentId_contact: { agentId: agent.id, contact: phone } },
    });

    const history: { role: "user" | "assistant"; content: any }[] = convo
      ? (convo.messages as any[])
      : [];

    // Monta o conteúdo da mensagem do usuário
    let userContent: any;

    if (messageType === "text") {
      userContent = body.text?.message || body.text || "";
    } else if (messageType === "image") {
      const mediaUrl = body.image?.imageUrl || body.imageUrl;
      const caption = body.image?.caption || "";
      userContent = [
        { type: "image_url", image_url: { url: mediaUrl } },
        { type: "text", text: caption || "O que está nessa imagem?" },
      ];
    } else if (messageType === "audio" || messageType === "ptt") {
      const mediaUrl = body.audio?.audioUrl || body.audioUrl;
      const audioBuffer = await downloadMedia(mediaUrl);
      const audioFile = new File([audioBuffer], "audio.ogg", { type: "audio/ogg" });
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "pt",
      });
      userContent = `[Áudio transcrito]: ${transcription.text}`;
    } else if (messageType === "video") {
      userContent = "[Usuário enviou um vídeo — responda que recebeu e pergunte o que precisa]";
    } else {
      userContent = "[Usuário enviou um arquivo]";
    }

    // Adiciona mensagem do usuário ao histórico
    history.push({ role: "user", content: userContent });

    // Chama o GPT-4o com a personalidade do agente
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `${agent.personality}\n\nREGRAS:\n- Responda sempre em português brasileiro\n- Seja natural e humanizado\n- Nunca mencione que é uma IA a menos que perguntado diretamente\n- Mantenha o contexto da conversa`,
        },
        ...history.slice(-20), // últimas 20 mensagens
      ],
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content ?? "Desculpe, não entendi. Pode repetir?";

    // Adiciona resposta ao histórico
    history.push({ role: "assistant", content: response });

    // Salva histórico
    await prisma.whatsappConversation.upsert({
      where: { agentId_contact: { agentId: agent.id, contact: phone } },
      create: { agentId: agent.id, contact: phone, messages: history },
      update: { messages: history },
    });

    // Decide se responde por texto ou áudio
    const shouldRespondWithAudio = messageType === "audio" || messageType === "ptt";

    if (shouldRespondWithAudio) {
      const audioBase64 = await generateAudio(response);
      await sendAudio(agent.instanceId, agent.token, phone, audioBase64);
    } else {
      await sendText(agent.instanceId, agent.token, phone, response);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp Webhook]", err);
    return NextResponse.json({ ok: true }); // sempre retorna 200 pra Z-API
  }
}
