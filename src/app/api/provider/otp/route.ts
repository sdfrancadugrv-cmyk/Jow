import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signProviderToken } from "@/lib/provider-auth";

async function sendOtpWhatsApp(phone: string, message: string): Promise<boolean> {
  // Tenta env vars diretas primeiro (mais confiável para OTP)
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (instanceId && token) {
    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
      body: JSON.stringify({ phone, message }),
    });
    return res.ok;
  }

  // Fallback: usa agente ativo do banco
  const agent = await prisma.whatsappAgent.findFirst({ where: { active: true } });
  if (!agent) return false;
  const url = `https://api.z-api.io/instances/${agent.instanceId}/token/${agent.token}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: JSON.stringify({ phone, message }),
  });
  return res.ok;
}

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

    const sent = await sendOtpWhatsApp(
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

    const needsProfile = !provider.serviceType;
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
