export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { gerarWidget } from "@/lib/voxshell-widget";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

const SITE_SYSTEM = `Você é o VoxShell, assistente especialista em criar sites profissionais com atendente de IA integrado.

Detecte a intenção do usuário e responda SEMPRE com um JSON válido:

════════════════════
INTENÇÃO: CRIAR SITE
Quando pedirem site, landing page, página para negócio.

Retorne:
{"type":"site","html":"HTML COMPLETO","message":"mensagem curta animada","slug":"slug-do-negocio","nome":"Nome do Negócio","nicho":"tipo do negócio","personalidade":"prompt completo do agente de IA para este negócio"}

O campo "personalidade" deve ser um prompt completo para o agente de atendimento deste negócio. Exemplo para clínica:
"Você é a assistente virtual da [Nome]. Atenda pacientes com simpatia, tire dúvidas sobre os serviços, horários e preços. Nunca forneça diagnósticos médicos. Quando o paciente quiser agendar, colete nome, serviço desejado e data preferida."

REGRAS DO HTML:
- Google Fonts (Inter ou Poppins via link no head)
- Responsivo, mobile-first, design profissional
- Fotos reais Unsplash (IDs reais):
  Restaurante: photo-1414235077428-338989a2e8c0, photo-1565299624946-b28f40a0ae38
  Barbearia: photo-1503951914875-452162b0f3f1, photo-1621605815971-fbc98d665033
  Clínica: photo-1519494026892-80bbd2d6fd0d
  Academia: photo-1534438327276-14e5300c3a48
  Salão: photo-1522337360788-8b13dee7a37e
  Imóveis: photo-1564013799919-ab600027ffc6
  Genérico: photo-1497366216548-37526070297c, photo-1454165804606-c3d57bc86b40
  Formato: https://images.unsplash.com/photo-ID?w=800&q=80&fit=crop
- Estrutura: navbar fixa, hero impactante, serviços/produtos com cards, depoimentos, contato, footer
- JS: menu hamburguer, scroll suave, hover effects
- Conteúdo 100% real (nomes, preços, descrições reais), NUNCA lorem ipsum
- NÃO inclua o widget de IA no HTML — ele será injetado depois

════════════════════
INTENÇÃO: CONFIGURAR AGENTE / WHATSAPP
Quando falarem sobre atendente, robô, WhatsApp, automação.

Retorne:
{"type":"agent_setup","message":"mensagem explicando o próximo passo","nicho":"nicho detectado","nome":"nome do negócio detectado"}

════════════════════
INTENÇÃO: VER MÉTRICAS / PAINEL
Quando perguntarem sobre leads, resultados, métricas.

Retorne:
{"type":"dashboard","message":"mensagem curta"}

════════════════════
INTENÇÃO: CONVERSA NORMAL
Para qualquer outra coisa.

Retorne:
{"type":"message","message":"resposta em português"}

Responda SEMPRE em português brasileiro. Retorne APENAS o JSON sem markdown.`;

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  const { messages, agentId, agentPhone } = await req.json();

  const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")?.content ?? "";

  // Pesquisa de nicho para enriquecer a geração do site
  let nichoResearch = "";
  try {
    const nichoMatch = lastUserMsg.match(
      /(pizzaria|restaurante|barbearia|academia|fitness|salão|beleza|carros?|imobiliária|clínica|médico|advocacia|advogado|loja|pet|farmácia|escola|curso|hotel|pousada|confeitaria|padaria)/i
    );
    if (nichoMatch && lastUserMsg.toLowerCase().includes("site")) {
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `Em 3 bullet points, descreva características visuais dos melhores sites do segmento "${nichoMatch[0]}" no Brasil. Seja direto.`,
        }],
      });
      nichoResearch = r.choices[0]?.message?.content ?? "";
    }
  } catch {}

  const systemContent = nichoResearch
    ? `${SITE_SYSTEM}\n\nREFERÊNCIA DE MERCADO:\n${nichoResearch}`
    : SITE_SYSTEM;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    messages: [
      { role: "system", content: systemContent },
      ...messages.slice(-10),
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Site gerado — injeta widget se agentId e phone já disponíveis
      if (parsed.type === "site" && parsed.html) {
        parsed.slug = slugify(parsed.slug || parsed.nome || "meu-site");

        if (agentId && agentPhone) {
          const agentNome = parsed.nome ? `Atendente ${parsed.nome}` : "Atendente Virtual";
          const widget = gerarWidget(agentId, agentPhone, agentNome);
          // Injeta o widget antes do </body>
          parsed.html = parsed.html.replace("</body>", `${widget}\n</body>`);
          parsed.widgetInjetado = true;
        }
      }

      // Dashboard — busca métricas reais
      if (parsed.type === "dashboard" && user) {
        try {
          const agents = await prisma.whatsappAgent.findMany({
            where: { clientId: user.sub },
            select: { id: true, name: true, active: true },
          });
          const agentIds = agents.map((a: any) => a.id);
          const convos = await prisma.whatsappConversation.findMany({
            where: { agentId: { in: agentIds } },
            select: { messages: true, updatedAt: true, humanMode: true },
          });
          const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
          const leadsHoje = convos.filter((c: any) =>
            new Date(c.updatedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === hoje
          ).length;
          const totalMsgs = convos.reduce((s: number, c: any) => s + ((c.messages as any[])?.length ?? 0), 0);

          parsed.stats = {
            totalLeads: convos.length,
            leadsHoje,
            totalMensagens: totalMsgs,
            humanModeAtivos: convos.filter((c: any) => c.humanMode).length,
            totalAgentes: agents.length,
            agentesAtivos: agents.filter((a: any) => a.active).length,
          };
        } catch {}
      }

      return NextResponse.json(parsed);
    }
  } catch (e) {
    console.error("[VoxShell Chat] parse error:", e);
  }

  return NextResponse.json({ type: "message", message: text });
}
