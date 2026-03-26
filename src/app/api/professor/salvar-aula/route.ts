import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const { mensagens, resumo, plano } = await req.json();

    if (!mensagens || mensagens.length < 2) {
      return NextResponse.json({ erro: "conversa muito curta" }, { status: 400 });
    }

    // Extrai o nome da matéria usando GPT
    const primeiras = mensagens.slice(0, 6)
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Aluno" : "Professor"}: ${m.content.substring(0, 200)}`
      ).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 60,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "Extraia o assunto principal desta aula em no máximo 5 palavras. Formato: 'Área - Tópico'. Exemplos: 'Matemática - Frações', 'Inglês - Present Perfect', 'História - Segunda Guerra'. Responda APENAS com o nome, sem ponto final.",
        },
        { role: "user", content: primeiras },
      ],
    });

    const materia = completion.choices[0].message.content?.trim() || "Aula sem título";

    const aula = await prisma.aulaProfessor.create({
      data: {
        clientId: user.id,
        materia,
        resumo: resumo || null,
        mensagens: mensagens as any,
        plano: plano || "professor-start",
      },
    });

    return NextResponse.json({ ok: true, materia, id: aula.id });
  } catch (e: any) {
    console.error("[PROFESSOR/SALVAR-AULA]", e.message);
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
