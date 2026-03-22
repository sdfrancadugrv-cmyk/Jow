export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ZAPI_BASE = "https://api.z-api.io/instances";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";

async function downloadMedia(url: string): Promise<Buffer> {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

const ZAPI_HEADERS = {
  "Content-Type": "application/json",
  "Client-Token": ZAPI_CLIENT_TOKEN,
};

async function sendText(instanceId: string, token: string, phone: string, text: string) {
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: ZAPI_HEADERS,
    body: JSON.stringify({ phone, message: text }),
  });
}

async function sendAudio(instanceId: string, token: string, phone: string, audioBase64: string) {
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/send-audio`, {
    method: "POST",
    headers: ZAPI_HEADERS,
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
    console.log("[WhatsApp Webhook] Recebido:", JSON.stringify(body).slice(0, 500));

    // Ignora mensagens enviadas pelo próprio bot
    if (body.fromMe) return NextResponse.json({ ok: true });

    const instanceId = body.instanceId as string;
    const phone = body.phone as string;

    // Z-API envia type="ReceivedCallback" — detecta o tipo pelo conteúdo
    const messageType = body.text ? "text"
      : body.image ? "image"
      : body.audio ? "audio"
      : body.video ? "video"
      : "unknown";

    console.log("[Webhook] instanceId:", instanceId, "phone:", phone, "type:", messageType);

    // Busca o agente pelo instanceId
    const agent = await prisma.whatsappAgent.findFirst({
      where: { instanceId, active: true },
    });

    console.log("[Webhook] agente encontrado:", agent ? agent.name : "NENHUM");
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
      userContent = body.text?.message || "";
    } else if (messageType === "image") {
      const mediaUrl = body.image?.imageUrl;
      const caption = body.image?.caption || "";
      userContent = [
        { type: "image_url", image_url: { url: mediaUrl } },
        { type: "text", text: caption || "O que está nessa imagem?" },
      ];
    } else if (messageType === "audio") {
      const mediaUrl = body.audio?.audioUrl;
      const audioBuffer = await downloadMedia(mediaUrl);
      const audioFile = new File([audioBuffer.buffer as ArrayBuffer], "audio.ogg", { type: "audio/ogg" });
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
    console.log("[Webhook] resposta GPT:", response.slice(0, 100));

    // Adiciona resposta ao histórico
    history.push({ role: "assistant", content: response });

    // Salva histórico
    await prisma.whatsappConversation.upsert({
      where: { agentId_contact: { agentId: agent.id, contact: phone } },
      create: { agentId: agent.id, contact: phone, messages: history },
      update: { messages: history },
    });

    // Decide se responde por texto ou áudio
    const shouldRespondWithAudio = messageType === "audio";

    console.log("[Webhook] enviando para:", phone, "audio:", shouldRespondWithAudio);
    console.log("[Webhook] usando instanceId:", agent.instanceId, "token:", agent.token.slice(0, 6) + "...");
    if (shouldRespondWithAudio) {
      const audioBase64 = await generateAudio(response);
      const sendResult = await fetch(`${ZAPI_BASE}/${agent.instanceId}/token/${agent.token}/send-audio`, {
        method: "POST",
        headers: ZAPI_HEADERS,
        body: JSON.stringify({ phone, audio: `data:audio/mp3;base64,${audioBase64}`, delay: 1000 }),
      });
      const sendBody = await sendResult.text();
      console.log("[Webhook] audio status:", sendResult.status);
      console.log("[Webhook] audio body:", sendBody);
    } else {
      const sendResult = await fetch(`${ZAPI_BASE}/${agent.instanceId}/token/${agent.token}/send-text`, {
        method: "POST",
        headers: ZAPI_HEADERS,
        body: JSON.stringify({ phone, message: response }),
      });
      const sendBody = await sendResult.text();
      console.log("[Webhook] texto status:", sendResult.status);
      console.log("[Webhook] texto body:", sendBody);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp Webhook]", err);
    return NextResponse.json({ ok: true }); // sempre retorna 200 pra Z-API
  }
}
