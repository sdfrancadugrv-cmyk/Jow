import { NextRequest, NextResponse } from "next/server";
import { createSite, getSites } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getSites());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const site = createSite({
    slug: body.slug,
    nicho: body.nicho,
    nome: body.nome,
    html: body.html,
    whatsapp: body.whatsapp ?? "",
    prompt_voz: body.prompt_voz ?? "",
    produto_tipo: body.produto_tipo ?? "basico",
    admin_senha: body.admin_senha,
    criado_em: new Date().toISOString(),
  });
  return NextResponse.json(site, { status: 201 });
}
