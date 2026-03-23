export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { checkAvailability, bookInstallation, formatAvailability } from "@/lib/googleCalendar";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ZAPI_BASE = "https://api.z-api.io/instances";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";
const OWNER_PHONE = process.env.OWNER_PHONE || "";

const ZAPI_HEADERS = {
  "Content-Type": "application/json",
  "Client-Token": ZAPI_CLIENT_TOKEN,
};

async function downloadMedia(url: string): Promise<Buffer> {
  const res = await fetch(url);
  return Buffer.from(await res.arrayBuffer());
}

async function sendText(instanceId: string, token: string, phone: string, text: string) {
  await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers: ZAPI_HEADERS,
    body: JSON.stringify({ phone, message: text }),
  });
}

async function generateAudio(text: string): Promise<string> {
  const audio = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: text,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await audio.arrayBuffer());
  return buffer.toString("base64");
}

async function notifyOwner(
  instanceId: string,
  token: string,
  clientName: string,
  clientPhone: string,
  clientAddress: string,
  date: string,
  hour: number
) {
  if (!OWNER_PHONE) return;
  const [y, m, d] = date.split("-");
  const turno = hour < 12 ? "manhã" : "tarde";
  const msg =
    `🔧 *Nova instalação agendada!*\n\n` +
    `👤 *Cliente:* ${clientName}\n` +
    `📱 *Telefone:* ${clientPhone}\n` +
    `📍 *Endereço:* ${clientAddress}\n` +
    `📅 *Data:* ${d}/${m}/${y} às ${hour === 13 ? "13h30" : `${hour}h`} (turno da ${turno})`;
  await sendText(instanceId, token, OWNER_PHONE, msg);
}

// Retorna data atual no fuso de Brasília
function nowBrasilia(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

// Mapeia dia da semana mencionado para data YYYY-MM-DD
function parseDateFromText(text: string): string | null {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const now = nowBrasilia();

  // "amanhã"
  if (t.includes("amanha")) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  // "depois de amanhã"
  if (t.includes("depois de amanha") || t.includes("depois amanha")) {
    const d = new Date(now); d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }

  // Dias da semana
  const weekdays: Record<string, number> = {
    "segunda": 1, "terca": 2, "quarta": 3, "quinta": 4, "sexta": 5, "sabado": 6, "domingo": 0,
  };
  for (const [name, target] of Object.entries(weekdays)) {
    if (t.includes(name)) {
      const d = new Date(now);
      const current = d.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7; // próxima ocorrência
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    }
  }

  // Formato DD/MM
  const dmMatch = t.match(/(\d{1,2})\/(\d{1,2})/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, "0");
    const month = dmMatch[2].padStart(2, "0");
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return null;
}

// Detecta se a conversa está no contexto de agendamento (histórico recente)
function isInSchedulingContext(history: any[]): boolean {
  const recent = history.slice(-6);
  const keywords = ["agendar", "instalar", "horario", "horário", "disponib", "marcar", "tecnico", "técnico", "turno", "manha", "tarde"];
  return recent.some((m) => {
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    const t = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return keywords.some((k) => t.includes(k));
  });
}

// Detecta tag de agendamento no texto do GPT
function extractBookingTag(text: string): {
  data: string; hora: number; nome: string; endereco: string;
} | null {
  const match = text.match(/\[AGENDAR:data=([^,]+),hora=(\d+),nome=([^,]+),endereco=([^\]]+)\]/i);
  if (!match) return null;
  return {
    data: match[1].trim(),
    hora: parseInt(match[2]),
    nome: match[3].trim(),
    endereco: match[4].trim(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[WhatsApp Webhook] Recebido:", JSON.stringify(body).slice(0, 500));

    if (body.fromMe) return NextResponse.json({ ok: true });

    const messageId = body.messageId as string;
    if (!messageId) return NextResponse.json({ ok: true });

    const instanceId = body.instanceId as string;
    const phone = body.phone as string;

    const messageType = body.text ? "text"
      : body.image ? "image"
      : body.audio ? "audio"
      : body.video ? "video"
      : "unknown";

    if (messageType === "unknown") return NextResponse.json({ ok: true });

    console.log("[Webhook] instanceId:", instanceId, "phone:", phone, "type:", messageType);

    const agent = await prisma.whatsappAgent.findFirst({
      where: { instanceId, active: true },
    });

    if (!agent) return NextResponse.json({ ok: true });

    let convo = await prisma.whatsappConversation.findUnique({
      where: { agentId_contact: { agentId: agent.id, contact: phone } },
    });

    const processedIds = (convo?.processedIds as string[]) ?? [];
    if (processedIds.includes(messageId)) {
      return NextResponse.json({ ok: true });
    }

    const history: { role: "user" | "assistant"; content: any }[] = convo
      ? (convo.messages as any[])
      : [];

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

    history.push({ role: "user", content: userContent });

    const brasiliaDate = nowBrasilia();
    const today = brasiliaDate.toLocaleDateString("pt-BR");
    const todayISO = `${brasiliaDate.getFullYear()}-${String(brasiliaDate.getMonth() + 1).padStart(2, "0")}-${String(brasiliaDate.getDate()).padStart(2, "0")}`;
    const lastUpdate = convo?.updatedAt;
    const lastUpdateDay = lastUpdate ? new Date(lastUpdate).toLocaleDateString("pt-BR") : null;
    const isFirstContactToday = !lastUpdateDay || lastUpdateDay !== today;

    const dailyContext = isFirstContactToday
      ? `CONTEXTO: Primeiro contato do dia (${today}). Apresente-se pelo nome escolhido como atendente da Economize H2O.`
      : `CONTEXTO: Cliente já foi atendido hoje (${today}). NÃO se apresente novamente. Retome o assunto de onde parou.`;

    // Tenta extrair dia mencionado na mensagem atual ou no histórico recente
    const userText = typeof userContent === "string" ? userContent : JSON.stringify(userContent);
    const inSchedulingContext = isInSchedulingContext([...history]);

    let calendarContext = "";

    if (inSchedulingContext && process.env.GOOGLE_CALENDAR_ID) {
      // Tenta pegar a data mencionada pelo cliente
      const mentionedDate = parseDateFromText(userText)
        || history.slice(-4).reverse().reduce((found: string | null, m: any) => {
          if (found) return found;
          const t = typeof m.content === "string" ? m.content : "";
          return parseDateFromText(t);
        }, null);

      if (mentionedDate) {
        // Cliente mencionou um dia — consulta apenas esse dia
        try {
          const av = await checkAvailability(mentionedDate);
          const info = formatAvailability(av);
          calendarContext = `\n\nAGENDA PARA O DIA SOLICITADO:\n${info}\n` +
            `Use exatamente esses dados. NÃO invente horários.\n` +
            `Quando o cliente confirmar nome completo e endereço completo, inclua na resposta a tag:\n` +
            `[AGENDAR:data=${mentionedDate},hora=HORA,nome=Nome Completo,endereco=Endereço Completo]\n` +
            `Substitua HORA pelo número do slot confirmado (ex: 8, 9, 13, 14...). A tag será processada automaticamente.`;
          console.log("[Webhook] agenda consultada para:", mentionedDate);
        } catch (err) {
          console.error("[Webhook] erro calendar:", err);
          calendarContext = `\n\nAGENDA: Sistema indisponível no momento. Diga ao cliente que vai confirmar o horário por outro canal e peça para aguardar.`;
        }
      } else {
        // Contexto de agendamento mas sem dia específico — instrui o agente a perguntar
        calendarContext = `\n\nINSTRUÇÃO DE AGENDAMENTO: O cliente demonstrou interesse em agendar. Pergunte qual dia da semana prefere para a instalação. NÃO consulte a agenda ainda — apenas pergunte o dia.`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `${agent.personality}\n\n${dailyContext}${calendarContext}`,
        },
        ...history.slice(-20),
      ],
      max_tokens: 500,
    });

    let response = completion.choices[0]?.message?.content ?? "Desculpe, não entendi. Pode repetir?";
    console.log("[Webhook] resposta GPT:", response.slice(0, 150));

    // Processa tag de agendamento se presente na resposta
    const booking = extractBookingTag(response);
    if (booking) {
      response = response.replace(/\[AGENDAR:[^\]]+\]/i, "").trim();
      try {
        const av = await checkAvailability(booking.data);
        const isAvailable = [...av.morning, ...av.afternoon].includes(booking.hora);
        if (isAvailable) {
          await bookInstallation({
            date: booking.data,
            hour: booking.hora,
            clientName: booking.nome,
            clientPhone: phone,
            clientAddress: booking.endereco,
          });
          await notifyOwner(agent.instanceId, agent.token, booking.nome, phone, booking.endereco, booking.data, booking.hora);
          console.log("[Webhook] instalação agendada:", booking);
        }
      } catch (err) {
        console.error("[Webhook] erro ao agendar:", err);
      }
    }

    history.push({ role: "assistant", content: response });

    const updatedIds = [...processedIds, messageId].slice(-50);
    await prisma.whatsappConversation.upsert({
      where: { agentId_contact: { agentId: agent.id, contact: phone } },
      create: { agentId: agent.id, contact: phone, messages: history, processedIds: updatedIds },
      update: { messages: history, processedIds: updatedIds },
    });

    const shouldRespondWithAudio = messageType === "audio";

    if (shouldRespondWithAudio) {
      const audioBase64 = await generateAudio(response);
      await fetch(`${ZAPI_BASE}/${agent.instanceId}/token/${agent.token}/send-audio`, {
        method: "POST",
        headers: ZAPI_HEADERS,
        body: JSON.stringify({ phone, audio: `data:audio/mp3;base64,${audioBase64}`, delay: 1000 }),
      });
    } else {
      const sendResult = await fetch(`${ZAPI_BASE}/${agent.instanceId}/token/${agent.token}/send-text`, {
        method: "POST",
        headers: ZAPI_HEADERS,
        body: JSON.stringify({ phone, message: response }),
      });
      const sendBody = await sendResult.text();
      console.log("[Webhook] texto status:", sendResult.status, sendBody);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp Webhook]", err);
    return NextResponse.json({ ok: true });
  }
}
