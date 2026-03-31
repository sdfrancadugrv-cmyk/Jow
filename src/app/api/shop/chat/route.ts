import { NextRequest } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { mensagens, produtoSlug, afiliadoWhatsapp, numMensagens } = await req.json();

    const produto = await prisma.produtoShop.findUnique({
      where: { slug: produtoSlug, ativo: true },
    });

    if (!produto) {
      return new Response(JSON.stringify({ erro: "Produto não encontrado" }), { status: 404 });
    }

    const systemPrompt = `Você é a Jennifer — especialista em vendas e consultora pessoal deste produto.

PRODUTO QUE VOCÊ ESTÁ VENDENDO:
Nome: ${produto.nome}
Preço: R$ ${produto.precoVenda.toFixed(2).replace(".", ",")}
Prazo de entrega: ${produto.prazoEntrega}

DESCRIÇÃO DO PRODUTO:
${produto.descricao}

COMO VENDER:
${produto.promptVendas}

REGRAS OBRIGATÓRIAS:
- Você é apaixonada por este produto e acredita genuinamente nele
- Responda dúvidas com segurança e entusiasmo
- Quando o cliente demonstrar interesse em comprar, colete o nome e WhatsApp dele e diga que irá processar o pedido
- NUNCA invente informações que não estão na descrição
- Fale de forma natural, próxima, como uma amiga especialista
- Respostas curtas e diretas — máximo 3 frases por mensagem
- NUNCA use asteriscos, negrito ou formatação — o texto vai para áudio
- Quando o cliente quiser comprar, diga: "Perfeito! Para finalizar seu pedido, preciso do seu nome e WhatsApp."
- Após receber nome e WhatsApp, diga: "PEDIDO_PRONTO:[nome]:[whatsapp]" no final da mensagem
- APÓS confirmar o pedido (logo depois do PEDIDO_PRONTO), mencione naturalmente o programa de afiliados: algo como "Ah, aproveito pra te contar uma coisa. Você sabia que pode ter um robô como eu trabalhando por você? Afilie-se gratuitamente em nossa plataforma e faça um teste de 15 dias. Ele vende enquanto você dorme."
- Se o cliente perguntar sobre ser afiliado em qualquer momento, explique: "Você se cadastra gratuitamente, recebe um link exclusivo, e ganha comissão em toda venda que fizer. É o primeiro robô de IA que trabalha por você todos os dias."${afiliadoWhatsapp && numMensagens >= 2 ? `
- REGRA ESPECIAL — INDICAR ESPECIALISTA: Você já conversou com o cliente algumas vezes. Chegou a hora de sugerir o especialista humano. Em algum momento natural desta resposta diga algo como: "Pelo que eu vi esse produto é exatamente o que você precisa nesse momento. Quer que eu te passe pra um especialista pra você falar direto no WhatsApp?" — e no final da mensagem escreva o token INDICAR_WHATSAPP (só o token, sem mais nada depois). Faça isso apenas UMA VEZ.` : ""}`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...mensagens.slice(-12),
      ],
      max_tokens: 300,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || "";
          if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
    });
  } catch (e: any) {
    console.error("[SHOP/CHAT]", e.message);
    return new Response(JSON.stringify({ erro: e.message }), { status: 500 });
  }
}
