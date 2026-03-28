export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { uploadFromUrl } from "@/lib/cloudinary";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const { descricao, contexto } = await req.json();
    if (!descricao?.trim()) return NextResponse.json({ erro: "Descreva a imagem" }, { status: 400 });

    // Monta prompt otimizado para imagens de página de vendas
    const prompt = contexto
      ? `Imagem profissional para página de vendas: ${descricao}. Contexto do produto: ${contexto}. Estilo: fotografia realista, alta qualidade, iluminação profissional, sem texto nem letras na imagem.`
      : `Imagem profissional para página de vendas: ${descricao}. Estilo: fotografia realista, alta qualidade, iluminação profissional, sem texto nem letras na imagem.`;

    // Gera a imagem com DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const tempUrl = response.data?.[0]?.url;
    if (!tempUrl) return NextResponse.json({ erro: "Falha ao gerar imagem" }, { status: 500 });

    // Faz upload para o Cloudinary (URL permanente)
    const urlPermanente = await uploadFromUrl(tempUrl);

    return NextResponse.json({ url: urlPermanente });
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
