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
  return randomBytes(3).toString("hex");
}

function detectarNicho(texto: string): string {
  const t = texto.toLowerCase();
  if (/carr[oa]|veícul|concession|automóv|sedan|suv|pick.?up|moto|frota|revenda/.test(t)) return "carros";
  if (/barbearia|barbeiro|barba/.test(t)) return "barbearia";
  if (/pizzaria|pizza/.test(t)) return "pizzaria";
  if (/restaurante|gastronomi/.test(t)) return "restaurante";
  if (/academia|fitness|musculação|crossfit|ginástica/.test(t)) return "academia";
  if (/salão|beleza|estética|manicure|cabeleireira/.test(t)) return "salao";
  if (/clínica|médico|saúde|dentista|psicólog|fisio/.test(t)) return "clinica";
  if (/imobiliária|imóvel|apartamento|corretor/.test(t)) return "imobiliaria";
  return "generico";
}

// ─── PROMPTS POR NICHO ────────────────────────────────────────────────────────

const PROMPT_CARROS = `Você é um web designer expert. Crie um site HTML COMPLETO para revenda de carros.

FOTOS — USE EXATAMENTE ESTAS URLs:
HERO: https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=90&fit=crop
CARRO 1: https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=85&fit=crop
CARRO 2: https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=85&fit=crop
CARRO 3: https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=85&fit=crop
CARRO 4: https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=85&fit=crop
CARRO 5: https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=85&fit=crop
CARRO 6: https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=85&fit=crop
CARRO 7: https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=85&fit=crop
CARRO 8: https://images.unsplash.com/photo-1580274455191-1c62282b1542?w=800&q=85&fit=crop

ESTRUTURA OBRIGATÓRIA:

1. NAVBAR fixa — logo + links + CTA "Ver Estoque" roxo
   Ao rolar 60px: fundo escuro + sombra (via JS scroll event)

2. HERO — foto HERO fullscreen com overlay escuro gradiente
   Título grande: nome da empresa (crie algo sofisticado)
   Subtítulo + 2 botões: [Ver Estoque] [Falar no WhatsApp]
   3 badges: ✓ X veículos ✓ Financiamento ✓ Procedência garantida

3. FILTROS — linha de botões pill:
   [Todos] [SUVs] [Sedans] [Hatchbacks] [Esportivos] [Picapes]
   Botão ativo fica roxo. JS: data-cat nos cards, filtro por click.

4. GRID DE CARROS — 8 cards com as fotos acima:
   Crie modelos REAIS: Toyota Corolla XEi 2023, Honda HR-V 2022, Jeep Compass 2023,
   Ferrari 488 Spider 2020, Ford Ranger XLT 2022, BMW 320i 2022, Hyundai HB20 2023, Chevrolet Onix RS 2023

   Cada card:
   - Foto com hover zoom (transform: scale(1.05) transition)
   - Badge colorido: DESTAQUE / NOVO / OPORTUNIDADE
   - Nome completo do modelo
   - Tags: ano | km | câmbio | combustível
   - Preço grande colorido
   - Parcela menor embaixo
   - Botões: [Ver Detalhes] [WhatsApp]
   - Card hover: sobe 6px + sombra maior

5. MODAL ao clicar "Ver Detalhes":
   - Overlay escuro (rgba 0,0,0,0.85) z-index 9999
   - Foto grande do carro
   - Nome + preço
   - Grid de specs: Motor | Potência | Câmbio | Tração | Km | Combustível | Cor | Portas | Ar cond. | Vidros elétricos
   - Descrição vendedora (2 parágrafos)
   - SIMULADOR: slider entrada (R$5k-50k) + select parcelas (12/24/36/48/60) + parcela calculada em JS
     Formula: parcela = (preco - entrada) * (0.018 / (1 - Math.pow(1.018, -meses)))
   - 2 botões grandes: [Falar com Vendedor no WhatsApp] [Agendar Test Drive]
   - Fechar com X e com click no overlay
   - Abrir/fechar com animação (opacity + scale)

6. SEÇÃO DIFERENCIAIS — 4 cards com ícone SVG:
   Procedência Garantida | Financiamento Fácil | Revisão Inclusa | Suporte Pós-Venda

7. DEPOIMENTOS — 3 cards com nome, texto, 5 estrelas amarelas

8. FOOTER — logo, links, redes sociais, copyright

JAVASCRIPT OBRIGATÓRIO:
- Filtros funcionais
- Modal abre/fecha
- Simulador de financiamento em tempo real
- Navbar scroll effect
- Scroll suave

CSS OBRIGATÓRIO:
- Google Fonts: Inter e Poppins via @import
- Cores: fundo #0a0a0a ou #111827, cards escuros, roxo #7c3aed como acento
- Animações @keyframes: fadeUp, scaleIn
- Cards e botões com transições suaves
- 100% responsivo mobile

RETORNE SOMENTE este JSON sem markdown:
{"type":"site","html":"HTML COMPLETO","message":"Seu site de carros está pronto! Veja o preview.","slug":"SLUG","nome":"NOME DA EMPRESA","nicho":"carros"}`;

const PROMPT_BARBEARIA = `Você é um web designer expert. Crie um site HTML COMPLETO para barbearia.

FOTOS:
HERO: https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=90&fit=crop
SERV1: https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=85&fit=crop
SERV2: https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=85&fit=crop
GALERIA1: https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=85&fit=crop
GALERIA2: https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=85&fit=crop
GALERIA3: https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=85&fit=crop
BARBEIRO: https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=85&fit=crop

ESTRUTURA: Navbar fixa | Hero cinematográfico escuro com foto HERO | Serviços em cards com foto, preço e botão agendar |
Galeria de cortes em grid | Sobre o barbeiro com foto BARBEIRO | Agendamento com formulário | Footer
CSS: Tema escuro masculino, fonte Oswald/Inter, dourado como acento (#d4af37 ou amber)
JS: Navbar scroll, smooth scroll, filtros de serviço, formulário de agendamento funcional

RETORNE SOMENTE JSON sem markdown:
{"type":"site","html":"HTML COMPLETO","message":"Barbearia pronta!","slug":"SLUG","nome":"NOME","nicho":"barbearia"}`;

const PROMPT_PIZZARIA = `Você é um web designer expert. Crie um site HTML COMPLETO para pizzaria.

FOTOS:
HERO: https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&q=90&fit=crop
PIZZA1: https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=85&fit=crop
PIZZA2: https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85&fit=crop
PIZZA3: https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=85&fit=crop
PIZZA4: https://images.unsplash.com/photo-1548369937-47519962c11a?w=800&q=85&fit=crop

ESTRUTURA: Navbar | Hero com foto HERO overlay vermelho/laranja | Cardápio por tabs [Tradicionais][Especiais][Vegetarianas][Bebidas] |
Cards de pizza com foto, ingredientes, preço, botão pedir | Promoções com countdown timer | Depoimentos | Footer
CSS: Vermelho/laranja quente, fonte elegante, animações no hero
JS: Tabs do cardápio, countdown timer real, smooth scroll

RETORNE SOMENTE JSON sem markdown:
{"type":"site","html":"HTML COMPLETO","message":"Pizzaria pronta!","slug":"SLUG","nome":"NOME","nicho":"pizzaria"}`;

const PROMPT_GENERICO = `Você é um web designer expert. Crie um site HTML COMPLETO e PROFISSIONAL para o negócio descrito.

FOTOS DISPONÍVEIS (use as mais adequadas):
https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=90&fit=crop
https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=90&fit=crop
https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=90&fit=crop
https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=90&fit=crop

ESTRUTURA: Navbar fixa | Hero impactante com foto e CTA | Serviços/produtos em cards | Sobre | Depoimentos | Contato | Footer
CSS: Design moderno, cores adequadas ao negócio, Google Fonts Inter, animações @keyframes fadeUp
JS: Navbar scroll, smooth scroll, animações ao rolar (IntersectionObserver)

RETORNE SOMENTE JSON sem markdown:
{"type":"site","html":"HTML COMPLETO","message":"Site pronto!","slug":"SLUG","nome":"NOME","nicho":"negócio"}`;

function getPromptPorNicho(nicho: string): string {
  switch (nicho) {
    case "carros": return PROMPT_CARROS;
    case "barbearia": return PROMPT_BARBEARIA;
    case "pizzaria": return PROMPT_PIZZARIA;
    default: return PROMPT_GENERICO;
  }
}

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { messages } = await req.json();

  const lastUserMsg =
    [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";

  const isSiteRequest = /site|criar|fazer|montar|desenvolver|quero um|preciso de um|gera|cria/.test(
    lastUserMsg.toLowerCase()
  );

  if (!isSiteRequest) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: 'Você é Vox, assistente de criação de sites por voz. Seja amigável. Responda em JSON: {"type":"message","message":"sua resposta"}',
        },
        ...messages,
      ],
    });
    const text = response.choices[0]?.message?.content ?? "";
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) return NextResponse.json(JSON.parse(m[0]));
    } catch {}
    return NextResponse.json({ type: "message", message: text });
  }

  const nicho = detectarNicho(lastUserMsg);
  const systemPrompt = getPromptPorNicho(nicho);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.type === "site" && parsed.html) {
        const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.nome ?? "meu-site");
        const senha = gerarSenha();

        createSite({
          slug,
          nicho: parsed.nicho ?? nicho,
          nome: parsed.nome ?? "Meu Site",
          html: parsed.html,
          whatsapp: "",
          prompt_voz: lastUserMsg,
          produto_tipo: "basico",
          admin_senha: senha,
          criado_em: new Date().toISOString(),
        });

        return NextResponse.json({ ...parsed, slug, admin_senha: senha });
      }

      return NextResponse.json(parsed);
    }
  } catch {}

  return NextResponse.json({ type: "message", message: text });
}
