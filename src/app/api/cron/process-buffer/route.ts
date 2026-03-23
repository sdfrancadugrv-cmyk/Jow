export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { processStaleBuffers } from "@/app/api/whatsapp/webhook/route";

// Chamado pelo Vercel Cron a cada 1 minuto como fallback.
// Garante que buffers sejam processados mesmo quando nenhum novo
// webhook chegar (ex: lead manda a última mensagem e para de escrever).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await processStaleBuffers();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Cron process-buffer]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
