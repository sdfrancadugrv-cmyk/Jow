import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

export const maxDuration = 30;

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let texto = "";
    let paginas = 0;

    try {
      // Importa direto da lib para evitar o bug do isDebugMode do pdf-parse
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import("pdf-parse/lib/pdf-parse.js" as any);
      const pdfParse = mod.default ?? mod;
      const parsed = await pdfParse(buffer);
      texto = parsed.text?.trim() ?? "";
      paginas = parsed.numpages ?? 0;
    } catch (parseErr: any) {
      console.error("[PROFESSOR/UPLOAD] pdf-parse falhou:", parseErr.message);
      return NextResponse.json({
        erro: "Não foi possível extrair o texto do PDF. Certifique-se de que o PDF contém texto (não é uma imagem escaneada).",
      }, { status: 422 });
    }

    if (!texto || texto.length < 50) {
      return NextResponse.json({
        erro: "O PDF parece estar vazio ou é composto apenas por imagens. Envie um PDF com texto selecionável.",
      }, { status: 422 });
    }

    return NextResponse.json({
      texto: texto.substring(0, 15000),
      paginas,
      nome: file.name,
    });
  } catch (e: any) {
    console.error("[PROFESSOR/UPLOAD]", e.message);
    return NextResponse.json({ erro: "Erro ao processar PDF: " + e.message }, { status: 500 });
  }
}
