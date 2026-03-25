export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const MAX_DEVICES = 2;
const DEVICE_EXPIRY_DAYS = 90;

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
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: "WhatsApp e senha são obrigatórios." }, { status: 400 });
    }

    const cleanPhone = (phone as string).replace(/\D/g, "");
    const client = await prisma.client.findUnique({ where: { phone: cleanPhone } });
    if (!client) {
      return NextResponse.json({ error: "Número não encontrado. Verifique ou assine um plano." }, { status: 401 });
    }

    if (!client.password) {
      return NextResponse.json({ error: "Nenhuma senha cadastrada. Acesse /assinar para criar sua conta." }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, client.password);
    if (!valid) {
      return NextResponse.json({ error: "Número ou senha incorretos." }, { status: 401 });
    }

    if (client.status !== "active") {
      return NextResponse.json({
        error: "Assinatura inativa. Verifique seu pagamento ou assine em kadosh.ai",
        code: "INACTIVE",
      }, { status: 403 });
    }

    // ── Gerenciamento de dispositivos ──────────────────────────────
    const existingDeviceToken = req.cookies.get("jow_device")?.value;
    let deviceToken: string;

    if (existingDeviceToken) {
      // Verifica se esse dispositivo já está registrado para este usuário
      const device = await prisma.device.findFirst({
        where: { token: existingDeviceToken, clientId: client.id },
      });

      if (device) {
        // Dispositivo conhecido — atualiza lastSeen
        await prisma.device.update({
          where: { id: device.id },
          data: { lastSeen: new Date() },
        });
        deviceToken = existingDeviceToken;
      } else {
        // Token não pertence a este usuário — trata como novo dispositivo
        deviceToken = await registerNewDevice(req, client.id);
        if (!deviceToken) {
          return NextResponse.json({
            error: "Limite de 2 dispositivos atingido. Acesse sua conta para gerenciar.",
            code: "DEVICE_LIMIT",
          }, { status: 429 });
        }
      }
    } else {
      // Novo dispositivo
      deviceToken = await registerNewDevice(req, client.id);
      if (!deviceToken) {
        return NextResponse.json({
          error: "Limite de 2 dispositivos atingido. Acesse sua conta para gerenciar.",
          code: "DEVICE_LIMIT",
        }, { status: 429 });
      }
    }

    // ── Gera JWT ───────────────────────────────────────────────────
    const token = signToken({
      sub: client.id,
      email: client.email ?? client.phone ?? "",
      name: client.name,
      status: client.status,
    });

    const res = NextResponse.json({ ok: true, name: client.name });

    // Cookie JWT (7 dias)
    res.cookies.set("jow_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // Cookie de dispositivo (90 dias)
    res.cookies.set("jow_device", deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * DEVICE_EXPIRY_DAYS,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[Login]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

async function registerNewDevice(req: NextRequest, clientId: string): Promise<string> {
  // Remove dispositivos inativos (sem acesso há mais de 90 dias)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  await prisma.device.deleteMany({
    where: { clientId, lastSeen: { lt: cutoff } },
  });

  const count = await prisma.device.count({ where: { clientId } });
  if (count >= MAX_DEVICES) return "";

  const token = uuidv4();
  const name = parseDeviceName(req.headers.get("user-agent"));
  await prisma.device.create({ data: { clientId, token, name } });
  return token;
}
