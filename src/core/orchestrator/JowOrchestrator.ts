import OpenAI from "openai";
import { selectAgents, AgentDef } from "../agents/agents";
import { getMemorySystemPrompt, checkAndSummarize, saveExchange } from "../memory/MemoryManager";
import { webSearch, needsWebSearch } from "../tools/webSearch";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const JOW_SYSTEM_PROMPT = `Você é JOW, um assistente pessoal de IA altamente especializado em análise e construção de software.

PERSONALIDADE:
- Confiante, direto e inteligente
- Fala em português brasileiro de forma natural
- Usa linguagem técnica quando apropriado
- Tem leveza e às vezes humor sutil
- Sempre entrega a MELHOR resposta possível
- Lembra de tudo que já foi conversado e usa esse contexto

REGRAS:
- Responda SEMPRE em português
- Seja conciso mas completo
- Nunca mencione "agentes" ou processo interno ao usuário
- Responda como JOW, uma entidade única e coesa
- Use a memória de conversas anteriores para personalizar respostas
- Se o usuário mencionar algo que foi dito antes, demonstre que lembra
- Você tem acesso à internet em tempo real — use para dar respostas atualizadas
- Quando tiver resultado de busca web, priorize essa informação como fonte`;

export interface OrchestrationResult {
  response: string;
  agentsUsed: string[];
}

async function consultAgent(agent: AgentDef, query: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: agent.systemPrompt },
      { role: "user", content: query },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content ?? "";
}

export async function orchestrate(
  query: string,
  history: { role: "user" | "assistant"; content: string }[],
  clientId = "owner"
): Promise<OrchestrationResult> {
  const agents = selectAgents(query);
  const agentsUsed: string[] = [];
  let agentContext = "";

  const [agentResults, searchResult] = await Promise.all([
    agents.length > 0
      ? Promise.all(agents.map((a) => consultAgent(a, query)))
      : Promise.resolve([]),
    needsWebSearch(query) ? webSearch(query) : Promise.resolve(""),
  ]);

  if (agents.length > 0) {
    agentsUsed.push(...agents.map((a) => a.name));
    agentContext = agents
      .map((a, i) => `[${a.name.toUpperCase()}]: ${agentResults[i]}`)
      .join("\n\n");
  }

  if (searchResult) {
    agentContext += `\n\n[BUSCA WEB]:\n${searchResult}`;
    if (!agentsUsed.includes("analyst")) agentsUsed.push("analyst");
  }

  const memoryPrompt = await getMemorySystemPrompt(clientId);
  const systemContent = JOW_SYSTEM_PROMPT + memoryPrompt;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history,
  ];

  if (agentContext) {
    messages.push({
      role: "system",
      content: `Insights dos especialistas (use para enriquecer sua resposta):\n${agentContext}`,
    });
  }

  messages.push({ role: "user", content: query });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 600,
    temperature: 0.8,
  });

  const response =
    completion.choices[0]?.message?.content ??
    "Desculpe, não consegui processar sua solicitação.";

  await saveExchange(query, response, clientId);
  const fullHistory = [
    ...history,
    { role: "user" as const, content: query },
    { role: "assistant" as const, content: response },
  ];
  checkAndSummarize(fullHistory, clientId);

  return { response, agentsUsed };
}
