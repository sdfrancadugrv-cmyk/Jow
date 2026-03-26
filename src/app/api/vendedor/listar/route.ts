import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });

    const produtos = await prisma.produtoVendedor.findMany({
      where: { clientId: user.sub },
      select: { slug: true, nome: true, preco: true, ativo: true, createdAt: true, imageLinks: true, videoLinks: true, salesLink: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(produtos);
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
