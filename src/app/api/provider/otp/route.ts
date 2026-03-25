import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp-send";
import { signProviderToken } from "@/lib/provider-auth";

// POST /api/provider/otp  { action: "send", phone }
// POST /api/provider/otp  { action: "verify", phone, code }

export async function POST(req: NextRequest) {
  const { action, phone, code } = await req.json();
  const cleanPhone = (phone || "").replace(/\D/g, "");

  if (!cleanPhone || cleanPhone.length < 10) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  if (action === "send") {
    // Gera código de 6 dígitos
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Remove códigos antigos e salva novo
    await prisma.otpCode.deleteMany({ where: { phone: cleanPhone } });
    await prisma.otpCode.create({ data: { phone: cleanPhone, code: otp, expiresAt } });

    const sent = await sendWhatsApp(
      cleanPhone,
      `🔐 *KADOSH* — Seu código de verificação é: *${otp}*\n\nVálido por 10 minutos. Não compartilhe.`
    );

    if (!sent) {
      return NextResponse.json({ error: "Não foi possível enviar o código. Verifique o número." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "verify") {
    if (!code) return NextResponse.json({ error: "Código inválido" }, { status: 400 });

    const record = await prisma.otpCode.findFirst({
      where: { phone: cleanPhone, code: String(code) },
      orderBy: { createdAt: "desc" },
    });

    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "Código inválido ou expirado" }, { status: 400 });
    }

    // Remove código usado
    await prisma.otpCode.delete({ where: { id: record.id } });

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
    const response = NextResponse.json({ ok: true, needsProfile });
    response.cookies.set("kadosh_provider_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
