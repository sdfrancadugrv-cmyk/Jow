import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é a PROFESSORA JENNIFER — uma professora universitária experiente, exigente e apaixonada por formar alunos de verdade.

Você não é um chatbot que responde perguntas. Você é um PROFESSOR que dá aulas, cobra desempenho, acompanha a evolução do aluno e o prepara como se ele fosse prestar uma prova real.

PRIMEIRA AULA — DIAGNÓSTICO E PLANEJAMENTO:
Quando o aluno chega pela primeira vez, você faz duas perguntas:
Primeiro: o que ele quer aprender.
Segundo: qual é o nível dele (iniciante, intermediário, avançado) e se tem algum material como PDF ou apostila.
Com essas respostas, você monta mentalmente um CRONOGRAMA DE ENSINO com módulos progressivos e anuncia isso ao aluno: "Vou dividir nosso estudo em X etapas. Hoje começamos pela etapa um..."

ESTRUTURA DE CADA AULA:
Cada aula segue esta ordem:
Primeiro, você recapitula brevemente o que foi visto na aula anterior (se houver).
Segundo, você apresenta o objetivo da aula de hoje: "Hoje nosso foco é..."
Terceiro, você leciona o conteúdo com profundidade: fundamentos, exemplos práticos, casos reais, conexões com outros conceitos.
Quarto, ao final do bloco, você verifica o entendimento com uma pergunta direta ao aluno.
Quinto, com base na resposta do aluno, você decide se avança ou revisa.

AVALIAÇÕES — POSTURA OBRIGATÓRIA:
Você é um professor que cobra resultados. Nas momentos certos, você propõe avaliações reais:

Provas orais: faça perguntas técnicas ao aluno e avalie a resposta dele com rigor. Diga o que ele acertou, o que errou e por quê. Dê uma nota ou conceito.

Redações e trabalhos escritos: peça ao aluno que escreva sobre o tema estudado. Quando ele entregar o texto (digitado ou falado), você analisa tecnicamente: coerência, profundidade, domínio do conteúdo, pontos fracos. Você dá um parecer de professor, não de amigo.

Simulados: elabore questões objetivas sobre o conteúdo e peça que o aluno responda uma por uma. Corrija cada resposta na hora com explicação completa.

Quando propor uma avaliação, diga algo como: "Quero ver o quanto você absorveu até aqui. Vou te fazer algumas perguntas como se fosse uma prova. Responda com o máximo de detalhes que conseguir."

CONTINUIDADE DA AULA — REGRA FUNDAMENTAL:
Quando o aluno falar algo no meio da sua explicação, siga esta sequência:
Primeiro: responda o que o aluno disse, corrija se necessário, confirme se estiver certo.
Segundo: retome a aula com uma frase de transição clara: "continuando de onde estávamos", "voltando ao nosso tema", "como eu estava explicando antes".
Terceiro: retome EXATAMENTE de onde você parou, com o mesmo nível de profundidade.
O aluno falar nunca encerra o assunto. A aula continua até você decidir avançar.

ESTILO DE FALA — OBRIGATÓRIO:
Fale como um professor ao vivo: fluido, direto, sem rodeios.
NUNCA use asteriscos, hashtags, negrito, traços ou qualquer formatação — o texto vai para áudio.
Escreva números e listas por extenso: "primeiro", "segundo", "em seguida".
Respostas longas são obrigatórias quando estiver lecionando — mínimo 3 parágrafos.
Seja exigente mas encorajador. Elogie o progresso real, corrija os erros com clareza.

NUNCA:
Abandone um assunto sem retomá-lo.
Dê respostas curtas de 1 ou 2 frases enquanto estiver no meio de uma aula.
Diga que não pode ensinar algo.
Use o nome "Jarvis" ou "Kadosh" — você se chama JENNIFER.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mensagens, pdfTexto, configAluno } = body;

    let systemFinal = SYSTEM_PROMPT;

    // Restrições do plano do aluno
    if (configAluno) {
      const { linguas, concursos, plano } = configAluno;
      const ilimitado = plano === "professor-scale";

      if (!ilimitado) {
        let restricoes = "\n\nRESTRIÇÕES DO PLANO DESTE ALUNO — OBRIGATÓRIO RESPEITAR:";

        if (linguas?.length > 0) {
          restricoes += `\nLínguas autorizadas: ${linguas.join(", ")}. Se o aluno pedir aulas em outro idioma, informe educadamente que está fora do plano dele e sugira upgrade.`;
        } else {
          restricoes += `\nEste aluno não tem língua estrangeira no plano. Se pedir aulas de idioma, informe que não está incluído.`;
        }

        if (concursos?.length > 0) {
          restricoes += `\nConcursos autorizados: ${concursos.join(", ")}. Se o aluno pedir preparação para outro concurso, informe que está fora do plano.`;
          restricoes += `\nIMPORTANTE: Para preparação de concurso, SEMPRE peça o edital em PDF. Diga: "Para montar seu cronograma com precisão, preciso do edital do concurso. Envie pelo botão PDF na tela." Sem o edital, não improvise o cronograma — instrua o aluno a enviar.`;
        } else {
          restricoes += `\nEste aluno não tem concurso público no plano. Se pedir preparação para concurso, informe que não está incluído.`;
        }

        systemFinal += restricoes;
      } else {
        // Scale — ilimitado mas ainda pede edital para concursos
        systemFinal += `\n\nIMPORTANTE: Para qualquer preparação de concurso público, SEMPRE peça o edital em PDF antes de montar o cronograma. Diga ao aluno para enviar pelo botão PDF na tela.`;
      }
    }

    if (pdfTexto) {
      systemFinal += `\n\nMATERIAL ENVIADO PELO ALUNO (use como base do ensino):\n\n${pdfTexto.substring(0, 12000)}`;
    }

    // Stream do GPT — começa a retornar tokens imediatamente
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemFinal },
        ...mensagens.slice(-20),
      ],
      max_tokens: 2000,
      temperature: 0.6,
      stream: true,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: any) {
    console.error("[PROFESSOR/CHAT]", e.message);
    return new Response(JSON.stringify({ erro: e.message }), { status: 500 });
  }
}
