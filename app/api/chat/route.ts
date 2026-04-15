import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createSite } from "@/lib/store";
import { randomBytes } from "crypto";

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

function gerarSenha(): string {
  return randomBytes(3).toString("hex"); // ex: a3f9c1
}

const RESEARCH_PROMPT = (nicho: string) => `Você é um especialista em web design. Analise os TOP 5 sites profissionais do segmento "${nicho}" e descreva:
1. Layout e estrutura de seções mais comuns
2. Paleta de cores predominante
3. Tipografia e estilo visual
4. Funcionalidades e interações mais usadas
5. Como eles apresentam produtos/serviços

Seja específico e detalhado. Esta análise será usada para criar um site profissional neste segmento.`;

const SYSTEM_PROMPT = `Você é Joe, um web designer expert. Com base na pesquisa de mercado fornecida, crie um site HTML COMPLETO e PROFISSIONAL.

REGRAS OBRIGATÓRIAS:

════════════════════════
1. FOTOS REAIS — USE APENAS ESTES IDs REAIS DO UNSPLASH:

CARROS:
  https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80&fit=crop

PIZZARIA/COMIDA:
  https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80&fit=crop

BARBEARIA:
  https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80&fit=crop

ACADEMIA/FITNESS:
  https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80&fit=crop

RESTAURANTE:
  https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80&fit=crop

SALÃO DE BELEZA:
  https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1560066984-138daaa0c2d4?w=800&q=80&fit=crop

CLÍNICA/SAÚDE:
  https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80&fit=crop

IMOBILIÁRIA:
  https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80&fit=crop

GENÉRICO:
  https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fit=crop
  https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&fit=crop

NUNCA invente IDs de foto. Use APENAS as URLs acima.

════════════════════════
2. DESIGN: Google Fonts (Inter/Poppins via link no head), cores harmônicas, gradientes, sombras, responsivo mobile-first.

════════════════════════
3. ESTRUTURA COMPLETA:
- Navbar fixa com logo e menu (hamburguer mobile funcional)
- Hero impactante com headline, subtítulo e CTA
- Produtos/serviços com cards e fotos reais
- Sobre / diferenciais
- Depoimentos realistas
- Contato / WhatsApp placeholder
- Footer completo

════════════════════════
4. CONTEÚDO 100% REAL: nomes, preços, descrições reais. NUNCA "Lorem ipsum".

════════════════════════
5. JAVASCRIPT FUNCIONAL OBRIGATÓRIO:
- Filtros de categoria: data-cat nos cards, botões com addEventListener que mostram/escondem com display:block/none
- Menu hamburguer funcional
- Scroll suave para âncoras
- Modal ao clicar em produto/card (detalhes expandidos)
- Hover effects

════════════════════════
6. PARA SITE DE CARROS:
- Filtros: [Todos][Sedans][SUVs][Hatchbacks][Esportivos]
- 6-8 modelos reais com ano, preço, km
- Modal com detalhes ao clicar "Ver detalhes"

Retorne SOMENTE este JSON (sem markdown):
{"type":"site","html":"HTML COMPLETO (escape aspas com \\")","message":"descrição","slug":"slug-do-negocio","nome":"Nome do Negócio","nicho":"tipo do negócio"}

Para propostas:
{"type":"proposal","title":"título","items":["item1"],"deadline":"X dias","price":"R$ X.XXX","message":"resumo"}

Para conversas normais:
{"type":"message","message":"resposta"}

Responda sempre em português brasileiro.`;

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { messages } = await req.json();

  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";

  // Step 1: research the niche
  let nichoResearch = "";
  try {
    const nichoMatch = lastUserMsg.match(/(pizzaria|restaurante|barbearia|academia|fitness|salão|beleza|carros?|veículos?|imobiliária|clínica|médico|advocacia|advogado|loja|pet shop|farmácia|escola|cursos?|tech|software|hotel|pousada|confeitaria|padaria|supermercado)/i);
    if (nichoMatch) {
      const r = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 800,
        messages: [{ role: "user", content: RESEARCH_PROMPT(nichoMatch[0]) }],
      });
      nichoResearch = r.choices[0]?.message?.content ?? "";
    }
  } catch {}

  // Step 2: generate the site
  const systemWithResearch = nichoResearch
    ? `${SYSTEM_PROMPT}\n\n════════════════════════\nPESQUISA DE MERCADO (inspire-se nisto para o design):\n${nichoResearch}`
    : SYSTEM_PROMPT;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    messages: [
      { role: "system", content: systemWithResearch },
      ...messages,
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Auto-save site to store
      if (parsed.type === "site" && parsed.html) {
        const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.nome ?? "meu-site");
        const senha = gerarSenha();

        createSite({
          slug,
          nicho: parsed.nicho ?? "negócio",
          nome: parsed.nome ?? "Meu Site",
          html: parsed.html,
          whatsapp: "",
          prompt_voz: "",
          produto_tipo: "basico",
          admin_senha: senha,
          criado_em: new Date().toISOString(),
        });

        return NextResponse.json({
          ...parsed,
          slug,
          admin_senha: senha,
        });
      }

      return NextResponse.json(parsed);
    }
  } catch {}

  return NextResponse.json({ type: "message", message: text });
}
