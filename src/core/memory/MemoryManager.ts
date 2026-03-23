import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUMMARIZE_THRESHOLD = 20;
const KEEP_RECENT = 10;

export interface MemoryContext {
  summaries: string[];
  recentHistory: { role: "user" | "assistant"; content: string }[];
}

// Mapa de conversas ativas por usuário
const conversationIds = new Map<string, string>();

async function getOrCreateConversationId(clientId: string): Promise<string> {
  if (conversationIds.has(clientId)) return conversationIds.get(clientId)!;
  const conv = await prisma.conversation.create({ data: { clientId } });
  conversationIds.set(clientId, conv.id);
  return conv.id;
}

export async function saveExchange(
  userMsg: string,
  jowMsg: string,
  clientId = "owner"
): Promise<void> {
  try {
    const conversationId = await getOrCreateConversationId(clientId);
    await prisma.message.createMany({
      data: [
        { role: "user", content: userMsg, conversationId },
        { role: "jow",  content: jowMsg,  conversationId },
      ],
    });
  } catch (err) {
    console.error("[Memory] Erro ao salvar:", err);
  }
}

export async function loadMemoryContext(clientId = "owner"): Promise<MemoryContext> {
  try {
    const memories = await prisma.memory.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
    });

    const recentMessages = await prisma.message.findMany({
      where: { conversation: { clientId } },
      orderBy: { createdAt: "desc" },
      take: KEEP_RECENT,
    });

    const recentHistory = recentMessages
      .reverse()
      .map((m) => ({
        role: (m.role === "jow" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      }));

    return {
      summaries: memories.map((m) => m.content),
      recentHistory,
    };
  } catch {
    return { summaries: [], recentHistory: [] };
  }
}

export async function checkAndSummarize(
  fullHistory: { role: "user" | "assistant"; content: string }[],
  clientId = "owner"
): Promise<void> {
  if (fullHistory.length < SUMMARIZE_THRESHOLD) return;

  const toSummarize = fullHistory.slice(0, fullHistory.length - KEEP_RECENT);
  if (toSummarize.length < 4) return;

  try {
    const conversation = toSummarize
      .map((m) => `${m.role === "user" ? "Usuário" : "KADOSH"}: ${m.content}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um sistema de memória para KADOSH, um assistente de IA.
Crie um resumo DENSO e DETALHADO da conversa abaixo.
O resumo deve capturar:
- Tópicos discutidos
- Decisões tomadas
- Preferências e características do usuário
- Projetos e tarefas mencionadas
- Informações importantes sobre o usuário
- Qualquer fato relevante que KADOSH deva lembrar

Seja específico e detalhado. Este resumo será usado para dar contexto ao KADOSH em conversas futuras.`,
        },
        { role: "user", content: `Resumir esta conversa:\n\n${conversation}` },
      ],
      max_tokens: 800,
    });

    const summary = completion.choices[0]?.message?.content;
    if (!summary) return;

    const now = new Date();
    const period = `${now.toLocaleDateString("pt-BR")} — ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

    await prisma.memory.create({
      data: { type: "summary", content: summary, period, msgCount: toSummarize.length, clientId },
    });
  } catch (err) {
    console.error("[Memory] Erro ao sumarizar:", err);
  }
}

export async function getMemorySystemPrompt(clientId = "owner"): Promise<string> {
  try {
    const memories = await prisma.memory.findMany({
      where: { clientId },
      orderBy: { createdAt: "asc" },
    });

    if (memories.length === 0) return "";

    const memoriesText = memories
      .map((m) => `[${m.period}]: ${m.content}`)
      .join("\n\n---\n\n");

    return `\n\n## MEMÓRIA DE LONGO PRAZO (conversas anteriores)\n${memoriesText}`;
  } catch {
    return "";
  }
}
