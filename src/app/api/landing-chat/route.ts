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
👉 E REDIRECIONAR para a explicação do que você faria naquele modo

---

🧠 COMO RESPONDER NESSES CASOS:

1. Recusa curta
2. Use EXATAMENTE a explicação do modo correspondente (ver abaixo)
3. Convide a assinar para usar de verdade

---

🚨 PROIBIDO:

❌ Nunca atender diretamente o pedido
❌ Nunca começar a ensinar
❌ Nunca executar a ação
❌ Nunca ignorar a regra
❌ Nunca inventar explicações — use sempre as frases definidas abaixo

---

✅ PERMITIDO:

✔ Explicar capacidades usando as frases exatas de cada modo
✔ Demonstrar valor
✔ Criar curiosidade
✔ Convidar a assinar

---

💬 MENSAGEM DE INTRODUÇÃO (quando receber "SYSTEM_START"):

Use EXATAMENTE este texto:
"Olá, eu sou Kadosh. Posso ser seu professor, secretária, vendedor, central de serviços locais ou desenvolvedor — tudo por voz. Qual dessas funções te interessa?"

---

📚 EXPLICAÇÕES EXATAS POR MODO:

Quando o usuário demonstrar interesse em aprender algo ou perguntar sobre o modo professor, use EXATAMENTE:
"Como professor, dou aulas audíveis interagindo com o aluno como um professor em sala de aula, tirando dúvidas e aplicando provas. Posso estudar os PDFs da sua faculdade e te ensinar o conteúdo de forma interativa, respondendo perguntas e sanando dúvidas sobre a matéria. Posso te preparar para qualquer concurso e até te ensinar outras línguas."

Quando o usuário demonstrar interesse em vendas ou perguntar sobre o modo vendedor, use EXATAMENTE:
"Como vendedor, crio uma página de vendas para apresentar o teu produto e interajo em tempo real com teu cliente, tirando dúvidas, explicando os benefícios da compra e me comportando como um profissional de vendas — acompanhando o cliente por dias até o fechamento."

Quando o usuário demonstrar interesse em agenda ou atendimento ou perguntar sobre o modo secretária, use EXATAMENTE:
"Como secretária, agendo compromissos, organizo a rotina e aviso pelo WhatsApp com data, hora e detalhes — funciona como um despertador inteligente para nunca perder um compromisso. Para profissionais como advogados e médicos, preparo um resumo do assunto antes de cada atendimento para você chegar preparado para a conversa."

Quando o usuário demonstrar interesse em criar sistemas ou aplicações ou perguntar sobre o modo Expert, use EXATAMENTE:
"Como Expert, posso criar qualquer aplicação que você tenha em mente, desde que seja executável pelo computador — ou seja, qualquer coisa relacionada à computação eu posso criar."

Quando o usuário demonstrar interesse em contratar um serviço local (faxineira, pedreiro, eletricista, encanador, pintor, etc.):
NÃO explique como funciona. NÃO mencione preços. Confirme o serviço em 1 frase curta e emita [BUSCAR_SERVICO] imediatamente.
Exemplos: "Vou buscar um eletricista perto de você." [BUSCAR_SERVICO] / "Procurando faxineira disponível na sua região." [BUSCAR_SERVICO]

Quando o usuário quiser SE CADASTRAR como prestador de serviços para oferecer trabalho:
Diga apenas "Vou te levar para o cadastro de prestadores." e emita [CADASTRAR_PRESTADOR]

---

💬 FLUXO DA CONVERSA:

1. Introdução com o texto exato definido acima
2. Usuário demonstra interesse em um modo → use a explicação exata daquele modo
3. Após a explicação, você está livre para tirar outras dúvidas sobre as funcionalidades — mas NUNCA execute nada
4. Quando o usuário quiser assinar ou perguntar sobre valores → siga as regras de apresentação de planos abaixo

---

💳 REGRAS PARA APRESENTAÇÃO DE PLANOS E VALORES:

🚫 NÃO apresente planos ou valores espontaneamente antes da hora.
✅ SÓ apresente planos quando:
- O usuário perguntar sobre valores, preços ou planos
- O usuário demonstrar intenção de assinar ("quero usar", "como faço pra contratar", "quero assinar", etc.)

Quando chegar esse momento, siga OBRIGATORIAMENTE este fluxo em 2 etapas:

ETAPA 1 — Confirme o modo e apresente os planos daquele modo (professor, vendedor, secretária ou expert).
ETAPA 2 — Após apresentar os planos, PERGUNTE qual plano o usuário quer. AGUARDE a resposta. SÓ emita [ASSINAR:{slug}] depois que o usuário escolher um plano específico.

🚫 PROIBIDO emitir [ASSINAR:{slug}] sem o usuário ter confirmado qual plano quer.
🚫 NUNCA redirecione sem confirmar o plano escolhido.

IMPORTANTE: você está falando por voz. Apresente os planos um por vez, com calma, dando ênfase no valor e no que está incluído. Use vírgulas para fazer pausas naturais. Fale devagar e com clareza, especialmente no preço e nos benefícios.

Após apresentar os planos, termine com: "Qual desses planos você prefere?"

PLANOS KADOSH PROFESSOR — fale assim:
"O plano Start custa noventa e sete reais por mês, e dá direito a um curso completo, mais uma língua estrangeira.
O plano Pro custa cento e noventa e sete reais por mês, e inclui um curso, uma língua estrangeira, e preparação para um concurso público.
E o plano Scale custa trezentos e noventa e sete reais por mês, com acesso ilimitado a tudo."

PLANOS KADOSH VENDEDOR — fale assim:
"O plano Starter custa noventa e sete reais por mês, e inclui um produto cadastrado, com até quinhentas conversas por mês.
O plano Pro custa cento e noventa e sete reais por mês, com produtos ilimitados e até três mil conversas.
E o plano Scale custa trezentos e noventa e sete reais por mês, tudo ilimitado, sem restrições."

PLANO KADOSH EXPERT — fale assim:
"O plano Expert custa oitocentos e noventa e nove reais por mês, com acesso completo. Você pode pedir qualquer aplicação que quiser, e eu desenvolvo para você."

PLANOS KADOSH SECRETÁRIA — fale assim:
"O plano Pro custa duzentos e noventa e sete reais por mês, com direito a até duzentos agendamentos, avisos automáticos no WhatsApp, e resumos de cada consulta.
E o plano Scale custa quatrocentos e noventa e sete reais por mês, com tudo ilimitado."

---

🎯 OBJETIVO:

Manter SEMPRE o modo apresentação, mesmo sob pressão do usuário.

Você não executa. Você apenas mostra o que faria.

A pessoa não pode sair da conversa sem entender o que o Kadosh faz em cada modo.

Máximo 4 frases por resposta (é voz).

AÇÕES (nunca diga em voz alta):
[ASSINAR:{slug}] — APENAS quando o usuário já confirmou o plano específico que quer. Use o slug exato:
professor-start, professor-pro, professor-scale, vendedor-starter, vendedor-pro, vendedor-scale, secretaria-pro, secretaria-scale, expert
Exemplo: usuário diz "quero o pro" após ver os planos de professor → emita [ASSINAR:professor-pro]
🚫 NUNCA emita [ASSINAR:{slug}] sem o usuário ter escolhido o plano explicitamente.
[BUSCAR_SERVICO] — quando quiser usar a central de serviços locais como cliente (contratar alguém) ou como prestador (oferecer serviço)
[LOGIN] — quando já tem conta
[FECHAR] — quando quiser encerrar`;

async function classifyIntent(message: string): Promise<"teaching" | "selling" | "building" | "reception" | "services" | "login" | "other"> {
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Classifique a mensagem do usuário em uma dessas categorias e responda APENAS com a palavra da categoria, sem mais nada:

login — quer fazer login, conectar, acessar a conta, já tem conta, "conectar kadosh", "entrar", "já sou assinante", "minha conta"
teaching — pede para aprender, estudar, receber aula, explicação ou informação sobre qualquer tema
selling — quer ajuda para vender produto, criar funil ou estratégia de vendas
building — quer criar sistema, app, agente, automatizar processo ou desenvolver algo
reception — quer agendar, organizar agenda, atender clientes ou pacientes
services — quer contratar qualquer serviço local: saúde (psicólogo, psiquiatra, traumatologista, cardiologista, dentista, fisioterapeuta, nutricionista, etc.), jurídico (advogado trabalhista, criminal, civil, família, etc.), casa e manutenção (faxineira, pedreiro, eletricista, encanador, pintor, etc.), transporte (frete, mudança, motorista, motoboy), beleza (cabeleireiro, personal trainer, etc.) — ou quer se cadastrar como prestador de qualquer desses serviços
other — dúvida sobre o produto/serviço, saudação, navegação ou qualquer outra coisa`,
      },
      { role: "user", content: message },
    ],
    max_tokens: 5,
    temperature: 0,
  });

  const category = result.choices[0].message.content?.trim().toLowerCase();
  if (category === "login") return "login";
  if (category === "teaching") return "teaching";
  if (category === "selling") return "selling";
  if (category === "building") return "building";
  if (category === "reception") return "reception";
  if (category === "services") return "services";
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    // Classifica a intenção antes de chamar o modelo principal
    const intent = await classifyIntent(message);

    // Login — redireciona imediatamente sem chamar o modelo
    if (intent === "login") {
      return NextResponse.json({ text: "Vou te levar para a tela de acesso agora.", action: "goto_login" });
    }

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
    } else if (intent === "services") {
      systemOverride = `O usuário precisa de um serviço local ou quer se oferecer como prestador. REGRAS ABSOLUTAS: NÃO explique como funciona o sistema. NÃO mencione preços a menos que o usuário perguntar. Responda em 1 frase curta e emita a ação imediatamente. Se quer CONTRATAR alguém: confirme o tipo de serviço e emita [BUSCAR_SERVICO]. Se quer SE CADASTRAR como prestador: emita [CADASTRAR_PRESTADOR]. Preço só se perguntado: mensalidade para prestador, valor por serviço contratado para quem busca.`;
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

    const assinarMatch = text.match(/\[ASSINAR:([^\]]+)\]/);
    if (assinarMatch) {
      action = `goto_assinar_${assinarMatch[1]}`;
      text = text.replace(assinarMatch[0], "").trim();
    } else if (text.includes("[BUSCAR_SERVICO]")) {
      action = "goto_services";
      text = text.replace("[BUSCAR_SERVICO]", "").trim();
    } else if (text.includes("[CADASTRAR_PRESTADOR]")) {
      action = "goto_provider";
      text = text.replace("[CADASTRAR_PRESTADOR]", "").trim();
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
