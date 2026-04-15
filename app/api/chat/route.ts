import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createSite } from "@/lib/store";
import { randomBytes } from "crypto";

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 40);
}
function gerarSenha(): string { return randomBytes(3).toString("hex"); }

function detectarNicho(texto: string): string {
  const t = texto.toLowerCase();
  if (/carr[oa]|veícul|concession|automóv|sedan|suv|pick.?up|frota|revenda/.test(t)) return "carros";
  if (/barbearia|barbeiro|barba/.test(t)) return "barbearia";
  if (/pizzaria|pizza/.test(t)) return "pizzaria";
  if (/restaurante|gastronomi/.test(t)) return "restaurante";
  if (/academia|fitness|musculação|crossfit|ginástica/.test(t)) return "academia";
  if (/salão|beleza|estética|manicure|cabeleireira/.test(t)) return "salao";
  if (/clínica|médico|saúde|dentista|psicólog|fisio/.test(t)) return "clinica";
  if (/imobiliária|imóvel|apartamento|corretor/.test(t)) return "imobiliaria";
  return "generico";
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT DE CARROS — pede HTML PURO, sem JSON
// ─────────────────────────────────────────────────────────────────────────────
const PROMPT_CARROS = `Você é o melhor web designer do mundo especializado em sites de revenda de veículos.
Crie um site HTML COMPLETO, RICO e IMPRESSIONANTE para uma revenda de carros premium.

IMPORTANTE:
- Responda SOMENTE com o HTML. Comece com <!DOCTYPE html> e termine com </html>.
- Nada de JSON, nada de markdown, nada de explicação. SÓ O HTML.
- NUNCA use foto de casa, escritório, natureza. SOMENTE as URLs de carros abaixo.
- O site deve ter NO MÍNIMO 800 linhas de código.

FOTOS — COLE ESTAS URLs EXATAS no src das imagens:
HERO  : https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=90&fit=crop
CARRO1: https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=85&fit=crop
CARRO2: https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=85&fit=crop
CARRO3: https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=85&fit=crop
CARRO4: https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=85&fit=crop
CARRO5: https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=85&fit=crop
CARRO6: https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=85&fit=crop
CARRO7: https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=85&fit=crop
CARRO8: https://images.unsplash.com/photo-1580274455191-1c62282b1542?w=800&q=85&fit=crop

SEÇÕES OBRIGATÓRIAS:

1. NAVBAR fixa com logo + menu + botão "Ver Estoque"
   JS: window.addEventListener('scroll', () => navbar fundo escuro quando scrollY > 80)

2. HERO fullscreen com background-image usando a URL HERO acima
   overlay: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.75))
   título grande + 2 botões + 3 contadores animados (JS countUp com requestAnimationFrame)

3. FILTROS: botões [Todos][SUVs][Sedans][Hatchbacks][Esportivos][Picapes]
   JS: cards têm data-cat, botão ativo fica destacado, mostra/esconde com transition

4. GRID DE 8 CARROS com fotos CARRO1 até CARRO8:
   Toyota Corolla XEi 2023 · R$142.900 · Sedan · 15.000km
   Jeep Compass Limited 2023 · R$189.900 · SUV · 8.500km
   Ferrari 488 GTB 2020 · R$1.890.000 · Esportivo · 12.000km
   BMW 320i Sport 2022 · R$249.900 · Sedan · 22.000km
   Chevrolet Camaro SS 2021 · R$389.900 · Esportivo · 18.000km
   Ford Ranger XLT 2022 · R$229.900 · Picape · 31.000km
   Honda HR-V EXL 2022 · R$159.900 · SUV · 19.000km
   Hyundai HB20 Diamond 2023 · R$89.900 · Hatch · 5.200km

   Cada card tem: foto com hover zoom (scale 1.06), badge (DESTAQUE/NOVO/OPORTUNIDADE),
   tags de ano/km/câmbio, preço grande, parcela menor, botões [Ver Detalhes][WhatsApp]
   Card hover: translateY(-8px) + sombra maior

5. MODAL ao clicar Ver Detalhes:
   overlay escuro, foto grande, especificações em grid (motor/potência/câmbio/km/combustível/cor/portas),
   descrição de 2 parágrafos, simulador de financiamento (slider entrada + select meses + cálculo JS em tempo real),
   botões [Falar com Vendedor] [Agendar Test Drive], fecha com X e com ESC

6. SEÇÃO DIFERENCIAIS: 4 cards com ícone SVG + título + texto

7. DEPOIMENTOS: 3 cards com nome, texto, estrelas

8. CTA FINAL com WhatsApp

9. FOOTER completo

CSS:
- Google Fonts Inter+Poppins via @import
- :root com variáveis de cor (tema escuro sofisticado, acento colorido)
- @keyframes fadeUp, scaleIn
- IntersectionObserver em todos [data-anim]
- Delays escalonados nos cards
- Mobile responsivo`;

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT GENÉRICO — HTML puro
// ─────────────────────────────────────────────────────────────────────────────
const buildPromptGenerico = (nicho: string, pedido: string) => `Você é o melhor web designer do mundo.
Crie um site HTML COMPLETO e IMPRESSIONANTE para: "${pedido}"

IMPORTANTE:
- Responda SOMENTE com o HTML. Comece com <!DOCTYPE html> e termine com </html>.
- Nada de JSON. Nada de markdown. SÓ o HTML.
- NUNCA Lorem ipsum. Conteúdo real e específico para "${nicho}".
- Mínimo 600 linhas de código.
- Use Google Fonts via @import
- Inclua animações com @keyframes e IntersectionObserver
- 100% responsivo

Fotos (use as mais adequadas ao nicho):
https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=90&fit=crop
https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=85&fit=crop
https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=85&fit=crop

Estrutura: Navbar fixa | Hero impactante com foto e CTA | Produtos/Serviços em cards com fotos |
Sobre | Depoimentos com estrelas | Contato | Footer`;

function getPrompt(nicho: string, pedido: string): string {
  if (nicho === "carros") return PROMPT_CARROS + `\n\nPEDIDO: "${pedido}"`;
  if (nicho === "barbearia") return `Você é o melhor web designer especializado em barbearias.
Crie um site HTML COMPLETO para barbearia premium. RESPONDA SOMENTE COM HTML PURO. Mínimo 600 linhas.
Fotos: HERO=https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=90&fit=crop S1=https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=85&fit=crop S2=https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=85&fit=crop
Tema: escuro #0a0a0a, dourado #d4af37. Seções: navbar, hero com HERO, serviços com preço, galeria, agendamento, footer.
PEDIDO: "${pedido}"`;
  if (nicho === "pizzaria" || nicho === "restaurante") return `Você é o melhor web designer especializado em restaurantes.
Crie um site HTML COMPLETO para ${nicho} premium. RESPONDA SOMENTE COM HTML PURO. Mínimo 600 linhas.
Fotos: HERO=https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&q=90&fit=crop P1=https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=85&fit=crop P2=https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85&fit=crop
Tema: vermelho #c0392b, laranja, acolhedor. Seções: navbar, hero com HERO, cardápio por tabs, depoimentos, footer.
PEDIDO: "${pedido}"`;
  return buildPromptGenerico(nicho, pedido);
}

// extrai slug e nome do HTML gerado
function extrairMeta(html: string, nicho: string): { slug: string; nome: string } {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const raw = titleMatch?.[1] || h1Match?.[1] || nicho;
  const nome = raw.replace(/<[^>]+>/g, "").trim().slice(0, 50) || "Meu Site";
  return { slug: slugify(nome), nome };
}

// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { messages } = await req.json();

  const lastUserMsg =
    [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";

  const isSiteRequest = /site|criar|fazer|montar|desenvolver|quero um|preciso de um|gera|cria/.test(
    lastUserMsg.toLowerCase()
  );

  // ── Conversa normal ───────────────────────────────────────────────────────
  if (!isSiteRequest) {
    const res = await openai.chat.completions.create({
      model: "gpt-4o", max_tokens: 300,
      messages: [
        { role: "system", content: 'Você é Vox, assistente criativo de sites. Seja amigável e breve. Responda: {"type":"message","message":"sua resposta"}' },
        ...messages,
      ],
    });
    const t = res.choices[0]?.message?.content ?? "";
    try { const m = t.match(/\{[\s\S]*\}/); if (m) return NextResponse.json(JSON.parse(m[0])); } catch {}
    return NextResponse.json({ type: "message", message: t });
  }

  // ── Gerar site: pede HTML puro ────────────────────────────────────────────
  const nicho = detectarNicho(lastUserMsg);
  const systemPrompt = getPrompt(nicho, lastUserMsg);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    temperature: 0.75,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Crie o site agora. Responda SOMENTE com o HTML completo, do <!DOCTYPE html> ao </html>. Sem JSON, sem explicação.` },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  // extrai HTML do resultado (remove possível markdown ```html)
  let html = text.trim();
  const mdMatch = html.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (mdMatch) html = mdMatch[1].trim();
  if (!html.toLowerCase().startsWith("<!doctype")) {
    const start = html.toLowerCase().indexOf("<!doctype");
    if (start > -1) html = html.slice(start);
  }

  if (html.toLowerCase().includes("</html>")) {
    const { slug: rawSlug, nome } = extrairMeta(html, nicho);
    const slug = rawSlug || slugify(lastUserMsg);
    const senha = gerarSenha();

    createSite({
      slug, nicho, nome, html,
      whatsapp: "", prompt_voz: lastUserMsg,
      produto_tipo: "basico", admin_senha: senha,
      criado_em: new Date().toISOString(),
    });

    return NextResponse.json({
      type: "site", html, slug, nome, nicho, admin_senha: senha,
      message: "Seu site está pronto! Veja o preview ao lado.",
    });
  }

  return NextResponse.json({ type: "message", message: "Não consegui gerar o site. Tente novamente com mais detalhes." });
}
