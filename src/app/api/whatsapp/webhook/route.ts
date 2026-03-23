export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { checkAvailability, bookInstallation, formatAvailability, findInstallation, cancelInstallationById } from "@/lib/googleCalendar";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ZAPI_BASE = "https://api.z-api.io/instances";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";
const OWNER_PHONE = process.env.OWNER_PHONE || "";

const ZAPI_HEADERS = {
  "Content-Type": "application/json",
  "Client-Token": ZAPI_CLIENT_TOKEN,
};

// Tempo de espera em ms antes de processar o buffer (debounce)
const BUFFER_DELAY_MS = 15000;

interface BufferedMessage {
  msgId: string;
  content: any;
  type: string;
}

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

  if (t.includes("amanha")) {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  if (t.includes("depois de amanha") || t.includes("depois amanha")) {
    const d = new Date(now); d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }

  const weekdays: Record<string, number> = {
    "segunda": 1, "terca": 2, "quarta": 3, "quinta": 4, "sexta": 5, "sabado": 6, "domingo": 0,
  };
  for (const [name, target] of Object.entries(weekdays)) {
    if (t.includes(name)) {
      const d = new Date(now);
      const current = d.getDay();
      let diff = target - current;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split("T")[0];
    }
  }

  const dmMatch = t.match(/(\d{1,2})\/(\d{1,2})/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, "0");
    const month = dmMatch[2].padStart(2, "0");
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return null;
}

function isInSchedulingContext(history: any[]): boolean {
  const recent = history.slice(-6);
  const keywords = ["agendar", "instalar", "horario", "horário", "disponib", "marcar", "tecnico", "técnico", "turno", "manha", "tarde"];
  return recent.some((m) => {
    const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    const t = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return keywords.some((k) => t.includes(k));
  });
}

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

function extractCancelTag(text: string): boolean {
  return /\[CANCELAR\]/i.test(text);
}

function hasCancelIntent(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ["cancelar", "cancela", "desmarcar", "desmarca", "nao quero mais", "desisti", "nao vou conseguir"].some((k) => t.includes(k));
}

// Combina múltiplas mensagens pendentes em um único conteúdo para o GPT
function combinePendingMessages(pending: BufferedMessage[]): { content: any; lastType: string } {
  if (pending.length === 1) {
    return { content: pending[0].content, lastType: pending[0].type };
  }

  const textParts: string[] = [];
  const imageParts: any[] = [];

  for (const msg of pending) {
    if (typeof msg.content === "string") {
      textParts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "image_url") imageParts.push(part);
        if (part.type === "text" && part.text) textParts.push(part.text);
      }
    }
  }

  const combinedText = textParts.join("\n");
  const content = imageParts.length > 0
    ? [...imageParts, { type: "text", text: combinedText }]
    : combinedText;

  const lastType = pending[pending.length - 1].type;
  return { content, lastType };
}

// Processa um buffer de mensagens e envia a resposta ao lead
export async function processConversationBuffer(convoId: string): Promise<void> {
  // Recarrega a conversa atualizada
  const convo = await prisma.whatsappConversation.findUnique({
    where: { id: convoId },
    include: { agent: true },
  });

  if (!convo || !convo.bufferVersion || convo.bufferVersion === "") return;

  const pending = convo.pendingMessages as unknown as BufferedMessage[];
  if (pending.length === 0) return;

  // Lock otimista: tenta marcar como PROCESSING
  const claimed = await prisma.whatsappConversation.updateMany({
    where: { id: convoId, bufferVersion: convo.bufferVersion },
    data: { bufferVersion: "PROCESSING" },
  });
  if (claimed.count === 0) return; // Outro handler já pegou

  try {
    const agent = (convo as any).agent;
    const phone = convo.contact;
    const history: { role: "user" | "assistant"; content: any }[] = (convo.messages as any[]) ?? [];

    // Combina todas as msgs pendentes em uma só
    const { content: combinedContent, lastType } = combinePendingMessages(pending);

    history.push({ role: "user", content: combinedContent });

    // Contexto do dia
    const brasiliaDate = nowBrasilia();
    const today = brasiliaDate.toLocaleDateString("pt-BR");
    const isFirstContactToday = convo.bufferIsFirst;

    const dailyContext = isFirstContactToday
      ? `CONTEXTO: Este é o PRIMEIRO contato do lead hoje (${today}). Apresente-se UMA ÚNICA VEZ no início da resposta. Não repita a apresentação em nenhuma outra mensagem.`
      : `CONTEXTO: Este lead já foi atendido hoje (${today}). PROIBIDO se apresentar novamente. NÃO diga seu nome como saudação. Retome o assunto de onde parou.`;

    // Contexto de agendamento
    const userText = typeof combinedContent === "string" ? combinedContent : JSON.stringify(combinedContent);
    const inSchedulingContext = isInSchedulingContext([...history]);
    let calendarContext = "";

    if (hasCancelIntent(userText) && process.env.GOOGLE_CALENDAR_ID) {
      try {
        const found = await findInstallation(phone);
        if (found) {
          const [y, m, d] = found.date.split("-");
          calendarContext = `\n\nCANCELAMENTO: O cliente tem uma instalação agendada para ${d}/${m}/${y} às ${found.hour}h (${found.clientName}). Confirme se deseja cancelar. Se confirmar, inclua [CANCELAR] na resposta.`;
        } else {
          calendarContext = `\n\nCANCELAMENTO: Não encontrei nenhuma instalação agendada para este cliente. Informe isso ao cliente com simpatia.`;
        }
      } catch (err) {
        console.error("[Buffer] erro ao buscar instalação:", err);
      }
    } else if (inSchedulingContext && process.env.GOOGLE_CALENDAR_ID) {
      const mentionedDate = parseDateFromText(userText)
        || history.slice(-4).reverse().reduce((found: string | null, m: any) => {
          if (found) return found;
          const t = typeof m.content === "string" ? m.content : "";
          return parseDateFromText(t);
        }, null);

      if (mentionedDate) {
        try {
          const av = await checkAvailability(mentionedDate);
          const info = formatAvailability(av);
          calendarContext = `\n\nAGENDA PARA O DIA SOLICITADO:\n${info}\n` +
            `Use exatamente esses dados. NÃO invente horários.\n` +
            `Quando o cliente confirmar nome completo e endereço completo, inclua na resposta a tag:\n` +
            `[AGENDAR:data=${mentionedDate},hora=HORA,nome=Nome Completo,endereco=Endereço Completo]\n` +
            `Substitua HORA pelo número do slot confirmado (ex: 8, 9, 13, 14...). A tag será processada automaticamente.`;
        } catch (err) {
          console.error("[Buffer] erro calendar:", err);
          calendarContext = `\n\nAGENDA: Sistema indisponível no momento. Diga ao cliente que vai confirmar o horário por outro canal e peça para aguardar.`;
        }
      } else {
        calendarContext = `\n\nINSTRUÇÃO DE AGENDAMENTO: O cliente demonstrou interesse em agendar. Pergunte qual dia da semana prefere para a instalação. NÃO consulte a agenda ainda — apenas pergunte o dia.`;
      }
    }

    const placeholderRule = `\nREGRA OBRIGATÓRIA: NUNCA escreva placeholders literais como [nome do cliente], [nome], {nome} ou qualquer texto entre colchetes/chaves na resposta. Se não souber o nome do cliente, simplesmente não use o nome — fale naturalmente sem ele.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `${agent.personality}\n\n${dailyContext}${calendarContext}${placeholderRule}`,
        },
        ...history.slice(-20),
      ],
      max_tokens: 500,
    });

    let response = completion.choices[0]?.message?.content ?? "Desculpe, não entendi. Pode repetir?";
    console.log("[Buffer] resposta GPT:", response.slice(0, 150));

    // Processa cancelamento
    if (extractCancelTag(response)) {
      response = response.replace(/\[CANCELAR\]/i, "").trim();
      try {
        const found = await findInstallation(phone);
        if (found) {
          await cancelInstallationById(found.eventId);
          const [y, m, d] = found.date.split("-");
          await notifyOwner(agent.instanceId, agent.token, found.clientName, phone, "CANCELAMENTO", found.date, found.hour);
        }
      } catch (err) {
        console.error("[Buffer] erro ao cancelar:", err);
      }
    }

    // Processa agendamento
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
        }
      } catch (err) {
        console.error("[Buffer] erro ao agendar:", err);
      }
    }

    history.push({ role: "assistant", content: response });

    // IDs processados: mescla pendingMsgIds com processedIds existentes
    const existingProcessedIds = (convo.processedIds as string[]) ?? [];
    const pendingIds = (convo.pendingMsgIds as string[]) ?? [];
    const updatedProcessedIds = [...existingProcessedIds, ...pendingIds].slice(-50);

    // Salva histórico e limpa o buffer
    await prisma.whatsappConversation.update({
      where: { id: convoId },
      data: {
        messages: history,
        processedIds: updatedProcessedIds,
        pendingMessages: [],
        pendingMsgIds: [],
        bufferUpdatedAt: null,
        bufferVersion: "",
        bufferIsFirst: false,
      },
    });

    // Envia resposta
    if (lastType === "audio") {
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
      console.log("[Buffer] texto status:", sendResult.status);
    }
  } catch (err) {
    console.error("[Buffer] erro ao processar conversa:", err);
    // Libera o lock em caso de erro para que o cron possa tentar novamente
    await prisma.whatsappConversation.update({
      where: { id: convoId },
      data: { bufferVersion: uuidv4() },
    });
  }
}

// Verifica todos os buffers "vencidos" (sem nova msg há mais de BUFFER_DELAY_MS)
export async function processStaleBuffers(): Promise<void> {
  const cutoff = new Date(Date.now() - BUFFER_DELAY_MS);

  const staleConvos = await prisma.whatsappConversation.findMany({
    where: {
      bufferUpdatedAt: { lte: cutoff },
      bufferVersion: { not: "", notIn: ["PROCESSING"] },
    },
    select: { id: true },
    take: 20,
  });

  for (const { id } of staleConvos) {
    await processConversationBuffer(id);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[WhatsApp Webhook] Recebido:", JSON.stringify(body).slice(0, 500));

    const instanceId = body.instanceId as string;
    const phone = body.phone as string;

    // Mensagem enviada pelo próprio número do agente (bot ou humano)
    if (body.fromMe) {
      const sentText = (body.text?.message || "").trim();
      const agent = await prisma.whatsappAgent.findFirst({ where: { instanceId, active: true } });
      if (!agent || !phone) return NextResponse.json({ ok: true });

      const cmd = sentText.toLowerCase();

      // /humano → pausa o bot, humano assume
      if (cmd === "/humano") {
        await prisma.whatsappConversation.upsert({
          where: { agentId_contact: { agentId: agent.id, contact: phone } },
          create: { agentId: agent.id, contact: phone, messages: [], processedIds: [], humanMode: true },
          update: { humanMode: true, pendingMessages: [], pendingMsgIds: [], bufferUpdatedAt: null, bufferVersion: "" },
        });
        console.log("[Webhook] humano assumiu conversa com", phone);
        return NextResponse.json({ ok: true });
      }

      // /bot → reativa o bot
      if (cmd === "/bot") {
        await prisma.whatsappConversation.updateMany({
          where: { agentId: agent.id, contact: phone },
          data: { humanMode: false },
        });
        console.log("[Webhook] bot reativado para", phone);
        return NextResponse.json({ ok: true });
      }

      // Qualquer outra mensagem fromMe: salva no histórico como "assistant" (humano falando com o lead)
      // mas só se humanMode estiver ativo — ignora echos do bot
      const existingConvo = await prisma.whatsappConversation.findUnique({
        where: { agentId_contact: { agentId: agent.id, contact: phone } },
      });
      if (!existingConvo?.humanMode) return NextResponse.json({ ok: true }); // echo do bot, ignora

      if (sentText) {
        const history = (existingConvo.messages as any[]) ?? [];
        history.push({ role: "assistant", content: sentText });
        await prisma.whatsappConversation.update({
          where: { id: existingConvo.id },
          data: { messages: history },
        });
      }
      return NextResponse.json({ ok: true });
    }

    const messageId = body.messageId as string;
    if (!messageId) return NextResponse.json({ ok: true });

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

    const convo = await prisma.whatsappConversation.findUnique({
      where: { agentId_contact: { agentId: agent.id, contact: phone } },
    });

    // Se humano assumiu a conversa, salva a msg do lead no histórico mas não responde
    if (convo?.humanMode) {
      const processedIds = (convo.processedIds as string[]) ?? [];
      if (!processedIds.includes(messageId)) {
        let humanModeContent: any = body.text?.message || "";
        if (body.image) humanModeContent = `[Imagem: ${body.image?.caption || "sem legenda"}]`;
        if (body.audio) humanModeContent = "[Áudio do lead durante atendimento humano]";
        if (body.video) humanModeContent = "[Vídeo do lead durante atendimento humano]";

        const history = (convo.messages as any[]) ?? [];
        history.push({ role: "user", content: humanModeContent });
        const updatedIds = [...processedIds, messageId].slice(-50);
        await prisma.whatsappConversation.update({
          where: { id: convo.id },
          data: { messages: history, processedIds: updatedIds },
        });
      }
      console.log("[Webhook] humanMode ativo para", phone, "— msg salva, bot silenciado");
      return NextResponse.json({ ok: true });
    }

    // Deduplicação: verifica processedIds E pendingMsgIds
    const processedIds = (convo?.processedIds as string[]) ?? [];
    const pendingMsgIds = (convo?.pendingMsgIds as string[]) ?? [];
    if (processedIds.includes(messageId) || pendingMsgIds.includes(messageId)) {
      return NextResponse.json({ ok: true });
    }

    // Prepara conteúdo da mensagem
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

    // Determina se é primeiro contato do dia (antes de qualquer atualização do buffer)
    const brasiliaDate = nowBrasilia();
    const today = brasiliaDate.toLocaleDateString("pt-BR");
    const lastUpdate = convo?.updatedAt;
    const lastUpdateDay = lastUpdate
      ? new Date(lastUpdate).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : null;
    const isFirstContactToday = !lastUpdateDay || lastUpdateDay !== today;

    // Adiciona mensagem ao buffer
    const existingPending = (convo?.pendingMessages as unknown as BufferedMessage[]) ?? [];
    const newPending: BufferedMessage[] = [...existingPending, { msgId: messageId, content: userContent, type: messageType }];
    const newPendingIds = [...pendingMsgIds, messageId];
    const newVersion = uuidv4();

    // Preserva bufferIsFirst da sessão atual (só define na primeira msg do batch)
    const bufferIsFirst = existingPending.length === 0 ? isFirstContactToday : (convo?.bufferIsFirst ?? isFirstContactToday);

    await prisma.whatsappConversation.upsert({
      where: { agentId_contact: { agentId: agent.id, contact: phone } },
      create: {
        agentId: agent.id,
        contact: phone,
        messages: [],
        processedIds: [],
        pendingMessages: newPending as any,
        pendingMsgIds: newPendingIds,
        bufferUpdatedAt: new Date(),
        bufferVersion: newVersion,
        bufferIsFirst: isFirstContactToday,
      },
      update: {
        pendingMessages: newPending as any,
        pendingMsgIds: newPendingIds,
        bufferUpdatedAt: new Date(),
        bufferVersion: newVersion,
        bufferIsFirst: bufferIsFirst,
      },
    });

    console.log("[Webhook] msg adicionada ao buffer, total pending:", newPending.length);

    // Aproveita o request para processar buffers vencidos de outros contatos
    await processStaleBuffers();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp Webhook]", err);
    return NextResponse.json({ ok: true });
  }
}
