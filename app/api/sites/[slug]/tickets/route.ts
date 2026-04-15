import { NextRequest, NextResponse } from "next/server";
import { getTickets, createTicket } from "@/lib/store";
import { randomUUID } from "crypto";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(getTickets(slug));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  const ticket = createTicket({
    id: randomUUID(),
    site_slug: slug,
    mensagem: body.mensagem,
    status: "aberto",
    criado_em: new Date().toISOString(),
  });
  return NextResponse.json(ticket, { status: 201 });
}
