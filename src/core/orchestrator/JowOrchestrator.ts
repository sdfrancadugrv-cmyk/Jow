import OpenAI from "openai";
import { selectAgents, AgentDef } from "../agents/agents";
import { getMemorySystemPrompt, checkAndSummarize, saveExchange } from "../memory/MemoryManager";
import { webSearch, needsWebSearch } from "../tools/webSearch";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ZAPI_BASE = "https://api.z-api.io/instances";
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";

const JOW_SYSTEM_PROMPT = `Você é JENNIFER, um assistente pessoal de IA altamente especializado, capaz de executar tarefas reais.

PERSONALIDADE:
- Confiante, direto e inteligente
- Fala em português brasileiro de forma natural
- Usa linguagem técnica quando apropriado
- Tem leveza e às vezes humor sutil
- Sempre entrega a MELHOR resposta possível
- Lembra de tudo que já foi conversado e usa esse contexto

CAPACIDADES:
- Criar agentes de WhatsApp que atendem clientes automaticamente
- Configurar personalidades e especialidades dos agentes
- Listar, editar e remover agentes existentes

REGRAS:
- Responda SEMPRE em português
- Seja conciso mas completo
- Responda como JENNIFER, uma entidade única e coesa
- Use a memória de conversas anteriores para personalizar respostas
- Você tem acesso à internet em tempo real
- Quando criar um agente, confirme o que foi configurado de forma clara

REGRA FUNDAMENTAL — NUNCA NEGAR:
- JAMAIS diga "não posso", "não consigo", "não é possível" ou qualquer variação negativa
- Se uma funcionalidade existe mas requer ativação de plano, diga que SIM, você pode fazer isso, e explique que para ativar basta o usuário liberar a funcionalidade correspondente no plano
- Exemplo correto: "Sim, posso fazer isso! Para eu conseguir te dar aulas como um professor, você precisa ativar a funcionalidade Jennifer Professor. Depois disso posso estudar seus PDFs, te dar aulas interativas, preparar para concursos e muito mais."
- Exemplo ERRADO: "Não posso fazer isso" ou "Essa função não está disponível"
- Sempre transmita confiança e possibilidade — você É capaz, só precisa que a funcionalidade esteja ativada
- Nunca use linguagem de limitação, sempre use linguagem de possibilidade`;

// Ferramentas que o JENNIFER pode executar
const TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "criar_agente_whatsapp",
      description: "Cria um agente de IA que atende automaticamente no WhatsApp com uma personalidade específica",
      parameters: {
        type: "object",
        properties: {
          instanceId: { type: "string", description: "ID da instância Z-API" },
          token: { type: "string", description: "Token da instância Z-API" },
          phone: { type: "string", description: "Número do WhatsApp no formato 5511999999999" },
          name: { type: "string", description: "Nome do agente" },
          personality: { type: "string", description: "Prompt de personalidade e especialidade do agente" },
        },
        required: ["instanceId", "token", "phone", "name", "personality"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_agentes_whatsapp",
      description: "Lista todos os agentes de WhatsApp criados pelo usuário",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "remover_agente_whatsapp",
      description: "Remove um agente de WhatsApp pelo ID ou nome",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do agente a remover" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_agente_whatsapp",
      description: "Edita o nome ou a personalidade de um agente de WhatsApp existente",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "ID do agente a editar" },
          name: { type: "string", description: "Novo nome do agente (opcional)" },
          personality: { type: "string", description: "Nova personalidade/prompt do agente (opcional)" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gerar_link_pagamento",
      description: "Gera um link de pagamento do Mercado Pago para cobrar um cliente. Use quando o usuário pedir para criar um link de pagamento, cobrar um cliente ou gerar um link de cobrança.",
      parameters: {
        type: "object",
        properties: {
          valor: { type: "number", description: "Valor em reais a cobrar. Ex: 147 para R$147,00" },
          descricao: { type: "string", description: "Descrição do que está sendo cobrado. Ex: 'Instalação dispositivo de retenção de ar'" },
        },
        required: ["valor", "descricao"],
      },
    },
  },
];

async function executeTool(name: string, args: any, clientId: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (name === "criar_agente_whatsapp") {
    try {
      const agent = await prisma.whatsappAgent.create({
        data: {
          clientId,
          instanceId: args.instanceId,
          token: args.token,
          phone: args.phone,
          name: args.name,
          personality: args.personality,
        },
      });

      // Configura webhook na Z-API
      const webhookUrl = `${appUrl}/api/whatsapp/webhook`;
      await fetch(`${ZAPI_BASE}/${args.instanceId}/token/${args.token}/update-webhook-received`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": ZAPI_CLIENT_TOKEN },
        body: JSON.stringify({ value: webhookUrl }),
      });

      return `Agente "${agent.name}" criado com sucesso! ID: ${agent.id}. O webhook foi configurado automaticamente. O agente já está pronto para atender no WhatsApp.`;
    } catch (err) {
      return `Erro ao criar agente: ${err}`;
    }
  }

  if (name === "listar_agentes_whatsapp") {
    const agents = await prisma.whatsappAgent.findMany({
      where: { clientId, active: true },
    });
    if (agents.length === 0) return "Nenhum agente criado ainda.";
    return agents.map((a) => `• ${a.name} — ${a.phone} (ID: ${a.id})`).join("\n");
  }

  if (name === "remover_agente_whatsapp") {
    await prisma.whatsappAgent.deleteMany({ where: { id: args.id, clientId } });
    return `Agente removido com sucesso.`;
  }

  if (name === "gerar_link_pagamento") {
    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpToken) return "Erro: MERCADO_PAGO_ACCESS_TOKEN não configurada no Vercel.";
    try {
      const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mpToken}`,
        },
        body: JSON.stringify({
          items: [{
            title: args.descricao,
            quantity: 1,
            unit_price: args.valor,
            currency_id: "BRL",
          }],
          payment_methods: {
            excluded_payment_types: [],
            installments: 12,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) return `Erro Mercado Pago: ${JSON.stringify(data)}`;
      const link = data.init_point;
      return `Link de pagamento gerado com sucesso!\n\n💳 **R$${args.valor.toFixed(2).replace(".", ",")} — ${args.descricao}**\n\n🔗 ${link}\n\nÉ só copiar e mandar pro cliente. Ele pode pagar com cartão de crédito, débito ou Pix.`;
    } catch (err) {
      return `Erro ao gerar link: ${err}`;
    }
  }

  if (name === "editar_agente_whatsapp") {
    const data: any = {};
    if (args.name) data.name = args.name;
    if (args.personality) data.personality = args.personality;
    await prisma.whatsappAgent.updateMany({ where: { id: args.id, clientId }, data });
    return `Agente atualizado com sucesso!`;
  }

  return "Ferramenta não reconhecida.";
}

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
      content: `Insights dos especialistas:\n${agentContext}`,
    });
  }

  messages.push({ role: "user", content: query });

  // Primeira chamada — com ferramentas
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: TOOLS,
    tool_choice: "auto",
    max_tokens: 800,
    temperature: 0.8,
  });

  const choice = completion.choices[0];
  let response = "";

  // Verifica se o modelo quer chamar uma ferramenta
  if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
    const toolCall = choice.message.tool_calls[0];
    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments);

    const toolResult = await executeTool(toolName, toolArgs, clientId);
    agentsUsed.push("executor");

    // Segunda chamada — com resultado da ferramenta
    const followUp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        ...messages,
        choice.message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        },
      ],
      max_tokens: 600,
      temperature: 0.8,
    });

    response = followUp.choices[0]?.message?.content ?? toolResult;
  } else {
    response = choice.message?.content ?? "Desculpe, não consegui processar sua solicitação.";
  }

  await saveExchange(query, response, clientId);
  const fullHistory = [
    ...history,
    { role: "user" as const, content: query },
    { role: "assistant" as const, content: response },
  ];
  checkAndSummarize(fullHistory, clientId);

  return { response, agentsUsed };
}
