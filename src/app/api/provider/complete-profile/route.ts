import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthProvider, signProviderToken } from "@/lib/provider-auth";

export async function POST(req: NextRequest) {
  const auth = await getAuthProvider();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { serviceType, dailyRate, lat, lng, city, name } = await req.json();

  if (!serviceType || !lat || !lng) {
    return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 });
  }

  try {
    const provider = await prisma.serviceProvider.update({
      where: { id: auth.sub },
      data: {
        serviceType,
        dailyRate: dailyRate ?? null,
        lat,
        lng,
        city: city || "",
        ...(name ? { name } : {}),
      },
    });

    // Renova o token com dados atualizados
    const token = signProviderToken({
      sub: provider.id,
      email: provider.email || "",
      name: provider.name,
      status: provider.status,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set("kadosh_provider_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint") && msg.includes("phone")) {
      return NextResponse.json({ error: "Este WhatsApp já está cadastrado" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro ao salvar perfil" }, { status: 500 });
  }
}
