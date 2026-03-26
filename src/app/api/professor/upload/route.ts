import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Importação dinâmica para evitar erro no Edge runtime
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);

    return NextResponse.json({
      texto: data.text.substring(0, 15000),
      paginas: data.numpages,
      nome: file.name,
    });
  } catch (e: any) {
    console.error("[PROFESSOR/UPLOAD]", e.message);
    return NextResponse.json({ erro: "Erro ao processar PDF: " + e.message }, { status: 500 });
  }
}
