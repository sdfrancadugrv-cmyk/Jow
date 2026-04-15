export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const ADMIN_KEY = process.env.VALVULA_ADMIN_KEY || "valvula2024";

// GET — lista pedidos (protegido por chave admin)
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const orders = await prisma.valvulaOrder.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

// POST — cria pedido pendente (antes do pagamento)
export async function POST(req: NextRequest) {
  try {
    const { nome, telefone, cep, endereco, opcao, valor } = await req.json();

    if (!nome || !telefone || !endereco || !opcao || !valor) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const order = await prisma.valvulaOrder.create({
      data: { nome, telefone, cep: cep || "", endereco, opcao, valor },
    });

    return NextResponse.json({ id: order.id });
  } catch (err) {
    console.error("[ValvulaOrders POST]", err);
    return NextResponse.json({ error: "Erro ao criar pedido" }, { status: 500 });
  }
}

// PATCH — atualiza status do pedido (admin)
export async function PATCH(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id, status } = await req.json();
  const updated = await prisma.valvulaOrder.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
