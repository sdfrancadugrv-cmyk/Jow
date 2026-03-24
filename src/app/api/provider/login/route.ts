import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { signProviderToken } from "@/lib/provider-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const provider = await prisma.serviceProvider.findUnique({ where: { email } });
    if (!provider) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

    if (!provider.password) return NextResponse.json({ error: "Use o login social para esta conta" }, { status: 401 });
    const valid = await bcrypt.compare(password, provider.password);
    if (!valid) return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });

    const token = signProviderToken({ sub: provider.id, email: provider.email || "", name: provider.name, status: provider.status });
    const cookieStore = await cookies();
    cookieStore.set("kadosh_provider_token", token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7, path: "/" });

    return NextResponse.json({ ok: true, provider: { id: provider.id, name: provider.name } });
  } catch (e) {
    console.error("provider/login error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
