import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("pdf") as File;

    if (!file) {
      return NextResponse.json({ erro: "nenhum arquivo enviado" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ erro: "PDF muito grande. Máximo 20MB." }, { status: 400 });
    }

    // Envia o PDF para a OpenAI extrair o texto
    const uploadedFile = await openai.files.create({
      file: new File([await file.arrayBuffer()], file.name, { type: "application/pdf" }),
      purpose: "assistants",
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extraia TODO o texto deste PDF e retorne apenas o texto extraído, sem comentários, sem introdução, sem formatação extra. Apenas o conteúdo bruto do documento.",
            },
            {
              // @ts-expect-error: file type supported pelo gpt-4o mas sem tipagem oficial
              type: "file",
              file: { file_id: uploadedFile.id },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    // Remove o arquivo temporário da OpenAI
    await openai.files.del(uploadedFile.id).catch(() => {});

    const texto = response.choices[0]?.message?.content?.trim() ?? "";

    if (!texto || texto.length < 50) {
      return NextResponse.json({
        erro: "Não foi possível extrair texto do PDF. O arquivo pode conter apenas imagens.",
      }, { status: 422 });
    }

    return NextResponse.json({
      texto: texto.substring(0, 15000),
      paginas: 1,
      nome: file.name,
    });
  } catch (e: any) {
    console.error("[PROFESSOR/UPLOAD]", e.message);
    return NextResponse.json({ erro: "Erro ao processar PDF: " + e.message }, { status: 500 });
  }
}
