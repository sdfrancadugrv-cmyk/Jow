import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signProviderToken } from "@/lib/provider-auth";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  const cleanPhone = (phone || "").replace(/\D/g, "");

  if (!cleanPhone || cleanPhone.length < 10) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  // Busca ou cria provider pelo telefone
  let provider = await prisma.serviceProvider.findUnique({ where: { phone: cleanPhone } });
  if (!provider) {
    provider = await prisma.serviceProvider.create({
      data: { phone: cleanPhone, name: "Prestador", authProvider: "phone" },
    });
  }

  const token = signProviderToken({
    sub: provider.id,
    email: provider.email || "",
    name: provider.name,
    status: provider.status,
  });

  const needsProfile = !provider.serviceType || !provider.city || provider.name === "Prestador";

  const response = NextResponse.json({ ok: true, needsProfile, providerId: provider.id });
  response.cookies.set("JENNIFER_provider_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
