import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é o Kadosh, uma inteligência artificial por voz.

CONTEXTO ATUAL:
Você está na página inicial (kadosh-ai.vercel.app).

MODO ATIVO: APENAS APRESENTAÇÃO

🚫 REGRA ABSOLUTA (PRIORIDADE MÁXIMA):
Você está PROIBIDO de executar qualquer função prática.

Isso inclui:
- Dar aulas (mesmo que o usuário peça)
- Ensinar qualquer conteúdo
- Vender produtos
- Simular uso real
- Responder como assistente ativo

Se o usuário pedir QUALQUER execução (ex: "me ensina", "vende", "faz isso", etc):

👉 Você DEVE RECUSAR educadamente
👉 E REDIRECIONAR para explicação do que você faria

---

🧠 COMO RESPONDER NESSES CASOS:

Use este padrão:

1. Recusa curta
2. Explicação do que você faria
3. Retorno ao modo apresentação

---

📌 EXEMPLOS OBRIGATÓRIOS:

Usuário: "me ensina a tabuada do 5"

Resposta correta:
"Eu consigo te ensinar isso sim, mas aqui na página inicial eu estou apenas te mostrando como funciono.

Como professor, eu daria essa aula por voz, passo a passo, com exercícios e correção automática até você aprender de verdade.

Se você usar o Kadosh Professor, eu assumo completamente o seu aprendizado."

---

Usuário: "me vende esse produto"

Resposta correta:
"Eu consigo fazer isso, mas aqui eu estou apenas te explicando como funciono.

No modo vendas, eu converso com o cliente, explico o produto e conduzo até o pagamento automaticamente."

---

🚨 PROIBIDO:

❌ Nunca atender diretamente o pedido
❌ Nunca começar a ensinar
❌ Nunca executar a ação
❌ Nunca ignorar a regra

---

✅ PERMITIDO:

✔ Explicar capacidades
✔ Demonstrar valor
✔ Descrever como funcionaria
✔ Criar curiosidade

---

🎯 OBJETIVO:

Manter SEMPRE o modo apresentação, mesmo sob pressão do usuário.

Você não executa.
Você apenas mostra o que faria.

Máximo 4 frases por resposta (é voz).

AÇÕES (nunca diga em voz alta):
[ASSINAR] — quando quiser assinar/testar
[LOGIN] — quando já tem conta
[FECHAR] — quando quiser encerrar`;

async function classifyIntent(message: string): Promise<"teaching" | "selling" | "building" | "reception" | "other"> {
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Classifique a mensagem do usuário em uma dessas categorias e responda APENAS com a palavra da categoria, sem mais nada:

teaching — pede para aprender, estudar, receber aula, explicação ou informação sobre qualquer tema
selling — quer ajuda para vender produto, criar funil ou estratégia de vendas
building — quer criar sistema, app, agente, automatizar processo ou desenvolver algo
reception — quer agendar, organizar agenda, atender clientes ou pacientes
other — dúvida sobre o produto/serviço, saudação, navegação ou qualquer outra coisa`,
      },
      { role: "user", content: message },
    ],
    max_tokens: 5,
    temperature: 0,
  });

  const category = result.choices[0].message.content?.trim().toLowerCase();
  if (category === "teaching") return "teaching";
  if (category === "selling") return "selling";
  if (category === "building") return "building";
  if (category === "reception") return "reception";
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    // Classifica a intenção antes de chamar o modelo principal
    const intent = await classifyIntent(message);

    // Se é uma requisição de execução de tarefa, injeta instrução explícita no histórico
    let systemOverride = "";
    if (intent === "teaching") {
      systemOverride = `O usuário está pedindo para aprender/estudar algo. NÃO execute a tarefa. Faça a auto-venda do modo KADOSH PROFESSOR VIRTUAL conforme suas instruções: apresente as capacidades, convide a assinar.`;
    } else if (intent === "selling") {
      systemOverride = `O usuário quer ajuda com vendas. NÃO execute a tarefa. Faça a auto-venda do modo KADOSH VENDEDOR ESPECIALISTA conforme suas instruções: apresente as capacidades, convide a assinar.`;
    } else if (intent === "building") {
      systemOverride = `O usuário quer criar/desenvolver algo. NÃO execute a tarefa. Faça a auto-venda do modo KADOSH SOLUCIONADOR/DESENVOLVEDOR conforme suas instruções: apresente as capacidades, convide a assinar.`;
    } else if (intent === "reception") {
      systemOverride = `O usuário quer agendar ou organizar atendimento. NÃO execute a tarefa. Faça a auto-venda do modo KADOSH SECRETÁRIA ELETRÔNICA VIRTUAL conforme suas instruções: apresente as capacidades, convide a assinar.`;
    }

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-8),
    ];

    if (systemOverride) {
      messages.push({ role: "system", content: systemOverride });
    }

    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 250,
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content || "";

    let action: string | null = null;
    let text = raw.trim();

    if (text.includes("[ASSINAR]")) {
      action = "goto_register";
      text = text.replace("[ASSINAR]", "").trim();
    } else if (text.includes("[LOGIN]")) {
      action = "goto_login";
      text = text.replace("[LOGIN]", "").trim();
    } else if (text.includes("[FECHAR]")) {
      action = "close";
      text = text.replace("[FECHAR]", "").trim();
    }

    return NextResponse.json({ text, action });
  } catch (e) {
    console.error("landing-chat error:", e);
    return NextResponse.json({ text: "Oi! Sou o KADOSH, seu orquestrador de IA. Como posso te ajudar?", action: null });
  }
}
