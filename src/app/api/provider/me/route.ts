import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthProvider } from "@/lib/provider-auth";

export async function GET() {
  try {
    const auth = await getAuthProvider();
    if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const provider = await prisma.serviceProvider.findUnique({
      where: { id: auth.sub },
      select: { id: true, name: true, email: true, phone: true, serviceType: true, city: true, rating: true, reviewCount: true, status: true },
    });
    if (!provider) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    return NextResponse.json({ provider });
  } catch (e) {
    console.error("provider/me error:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
