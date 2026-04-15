import { NextRequest, NextResponse } from "next/server";
import { getSite } from "@/lib/store";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { senha } = await req.json();
  const site = getSite(slug);
  if (!site) return NextResponse.json({ ok: false, error: "Site não encontrado" });
  if (site.admin_senha !== senha) return NextResponse.json({ ok: false, error: "Senha incorreta" });
  return NextResponse.json({ ok: true, nome: site.nome, nicho: site.nicho });
}
