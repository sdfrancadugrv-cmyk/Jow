import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp-send";
import { signToken } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

function parseDeviceName(ua: string | null): string {
  if (!ua) return "Dispositivo desconhecido";
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return `Windows (${/chrome/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : "Navegador"})`;
  if (/mac/i.test(ua)) return `Mac (${/chrome/i.test(ua) ? "Chrome" : /safari/i.test(ua) ? "Safari" : "Navegador"})`;
  return "Navegador";
}

export async function POST(req: NextRequest) {
  const { action, phone, code } = await req.json();
  const cleanPhone = (phone || "").replace(/\D/g, "");

  if (!cleanPhone || cleanPhone.length < 10) {
    return NextResponse.json({ error: "Número inválido" }, { status: 400 });
  }

  if (action === "send") {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.otpCode.deleteMany({ where: { phone: cleanPhone } });
    await prisma.otpCode.create({ data: { phone: cleanPhone, code: otp, expiresAt } });

    const sent = await sendWhatsApp(
      cleanPhone,
      `🔐 *KADOSH* — Seu código de acesso é: *${otp}*\n\nVálido por 10 minutos. Não compartilhe.`
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

    await prisma.otpCode.delete({ where: { id: record.id } });

    // Busca cliente pelo telefone
    const client = await prisma.client.findUnique({ where: { phone: cleanPhone } });

    if (!client) {
      return NextResponse.json({
        error: "Nenhuma conta encontrada com este número. Assine o KADOSH para ter acesso.",
        code: "NOT_FOUND",
      }, { status: 404 });
    }

    if (client.status !== "active") {
      return NextResponse.json({
        error: "Assinatura inativa. Renove para continuar.",
        code: "INACTIVE",
      }, { status: 403 });
    }

    // Gerencia dispositivos (máx 2)
    const existingDeviceToken = req.cookies.get("jow_device")?.value;
    let deviceToken: string;

    if (existingDeviceToken) {
      const device = await prisma.device.findFirst({
        where: { token: existingDeviceToken, clientId: client.id },
      });
      if (device) {
        await prisma.device.update({ where: { id: device.id }, data: { lastSeen: new Date() } });
        deviceToken = existingDeviceToken;
      } else {
        deviceToken = await registerNewDevice(req, client.id);
        if (!deviceToken) {
          return NextResponse.json({
            error: "Limite de 2 dispositivos atingido.",
            code: "DEVICE_LIMIT",
          }, { status: 429 });
        }
      }
    } else {
      deviceToken = await registerNewDevice(req, client.id);
      if (!deviceToken) {
        return NextResponse.json({
          error: "Limite de 2 dispositivos atingido.",
          code: "DEVICE_LIMIT",
        }, { status: 429 });
      }
    }

    const token = signToken({
      sub: client.id,
      email: client.email || "",
      name: client.name,
      status: client.status,
    });

    const res = NextResponse.json({ ok: true, name: client.name });

    res.cookies.set("jow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    res.cookies.set("jow_device", deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });

    return res;
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}

async function registerNewDevice(req: NextRequest, clientId: string): Promise<string> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  await prisma.device.deleteMany({ where: { clientId, lastSeen: { lt: cutoff } } });

  const count = await prisma.device.count({ where: { clientId } });
  if (count >= 2) return "";

  const token = uuidv4();
  const name = parseDeviceName(req.headers.get("user-agent"));
  await prisma.device.create({ data: { clientId, token, name } });
  return token;
}
