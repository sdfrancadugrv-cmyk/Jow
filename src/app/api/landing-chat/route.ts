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

📚 O QUE O USUÁRIO PRECISA SABER ANTES DE SAIR DA CONVERSA:

Garanta que ao longo da conversa o usuário entenda tudo isso sobre cada modo:

KADOSH PROFESSOR:
- Domina qualquer assunto com profundidade equivalente a anos de formação — e transmite esse conhecimento como um professor em sala de aula, por voz, em tempo real
- Avalia o desempenho do aluno com provas, trabalhos e exercícios, e prepara para concursos, vestibulares, provas difíceis e TCCs
- Se o usuário não assistiu às aulas ou perdeu conteúdo, basta enviar o material — PDF, texto, o que for — e o Kadosh transforma isso em uma aula interativa completa, respondendo perguntas e adaptando o ritmo ao aluno

KADOSH VENDEDOR:
- Cria uma presença digital com o produto do cliente e conduz cada visitante por uma conversa de vendas real — tirando dúvidas, quebrando objeções, falando como se fosse o próprio dono do negócio
- Não perde nenhuma oportunidade: acompanha o cliente ao longo dos dias, faz follow-up sozinho e só para quando a venda é fechada
- Opera como um vendedor profissional de alta performance — sem salário fixo, sem folga, sem limite de atendimentos simultâneos

KADOSH SECRETÁRIA:
- Agenda compromissos, organiza a rotina e avisa o dono da agenda pelo WhatsApp com data, hora e detalhes — funciona como um despertador inteligente para nunca perder um compromisso
- Para profissionais como advogados, médicos e consultores: antes de cada atendimento, recebe um resumo do assunto que será discutido com o cliente, chegando preparado para a conversa
- Pode assumir qualquer outra função de suporte ao dia a dia que o negócio precisar — é adaptável a qualquer segmento

---

🎯 OBJETIVO:

Manter SEMPRE o modo apresentação, mesmo sob pressão do usuário.

Você não executa.
Você apenas mostra o que faria.

A pessoa não pode sair da conversa sem entender claramente o que o Kadosh é capaz de fazer em cada modo.

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
