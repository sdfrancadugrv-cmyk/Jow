import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { signProviderToken } from "@/lib/provider-auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, serviceType, lat, lng, city } = await req.json();

    if (!name || !email || !password || !phone || !serviceType || lat == null || lng == null) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const existing = await prisma.serviceProvider.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return NextResponse.json({ error: "Email ou telefone já cadastrado" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const provider = await prisma.serviceProvider.create({
      data: { name, email, password: hashed, phone, serviceType, lat, lng, city: city || "", status: "active" },
    });

    const token = signProviderToken({ sub: provider.id, email: provider.email || "", name: provider.name, status: provider.status });
    const cookieStore = await cookies();
    cookieStore.set("kadosh_provider_token", token, { httpOnly: true, secure: true, maxAge: 60 * 60 * 24 * 7, path: "/" });

    return NextResponse.json({ ok: true, provider: { id: provider.id, name: provider.name, email: provider.email } });
  } catch (e) {
    console.error("provider/register error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
