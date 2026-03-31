import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const saques = await prisma.saqueShop.findMany({
    orderBy: { createdAt: "desc" },
    include: { afiliado: { select: { nome: true, whatsapp: true } } },
  });

  return NextResponse.json({ saques });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user?.isAdmin) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

  const { id } = await req.json();
  const saque = await prisma.saqueShop.update({
    where: { id },
    data: { status: "pago" },
    include: { afiliado: { select: { nome: true, whatsapp: true } } },
  });

  // Avisa o afiliado
  if (saque.afiliado?.whatsapp) {
    const msg = `✅ *Jennifer Shop* — PIX enviado!\n\nOlá ${saque.afiliado.nome.split(" ")[0]}! Seu saque de R$ ${saque.valor.toFixed(2).replace(".", ",")} foi pago para a chave PIX ${saque.pixKey}. 💚`;
    await fetch(`https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Client-Token": process.env.ZAPI_CLIENT_TOKEN! },
      body: JSON.stringify({ phone: saque.afiliado.whatsapp, message: msg }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
