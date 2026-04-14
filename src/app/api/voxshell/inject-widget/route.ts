export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { gerarWidget } from "@/lib/voxshell-widget";

export async function POST(req: NextRequest) {
  const { html, agentId, phone, agentName } = await req.json();

  if (!html || !agentId || !phone) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const widget = gerarWidget(agentId, phone, agentName || "Atendente Virtual");

  // Remove widget anterior se já existir, depois injeta o novo
  const semWidget = html.replace(/<!-- VoxShell AI Widget -->[\s\S]*?<!-- Fim VoxShell Widget -->/g, "");
  const novoHtml = semWidget.replace("</body>", `${widget}\n</body>`);

  return NextResponse.json({ html: novoHtml });
}
