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

// ─── PROMPT: CARROS ──────────────────────────────────────────────────────────
const PROMPT_CARROS = `Você é um web designer especialista em sites de revenda de veículos.
Crie um site HTML completo e profissional para uma revenda de carros premium.

REGRAS:
- NUNCA use Lorem ipsum
- NUNCA use fotos de casas, escritórios ou qualquer coisa que não seja carro
- Use APENAS as URLs de fotos listadas abaixo — são todas fotos de carros
- Código completo do <!DOCTYPE html> até </html>
- Responda SOMENTE o JSON no final, sem markdown

FOTOS DE CARROS (USE TODAS ESTAS, NA ORDEM INDICADA):
IMG_HERO  = https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=90&fit=crop
IMG_CAR_1 = https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=85&fit=crop
IMG_CAR_2 = https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=85&fit=crop
IMG_CAR_3 = https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=85&fit=crop
IMG_CAR_4 = https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=85&fit=crop
IMG_CAR_5 = https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=85&fit=crop
IMG_CAR_6 = https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=85&fit=crop
IMG_CAR_7 = https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=85&fit=crop
IMG_CAR_8 = https://images.unsplash.com/photo-1580274455191-1c62282b1542?w=800&q=85&fit=crop

ESTRUTURA DO SITE:

[1] NAVBAR fixa — logo da empresa + links (Início, Estoque, Financiamento, Contato) + botão "Ver Estoque"
    JS: ao rolar 80px adiciona classe 'scrolled' que aplica fundo escuro + sombra

[2] HERO — fullscreen usando IMG_HERO como background-image
    overlay: linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.75))
    Conteúdo: nome da empresa + slogan impactante + 2 botões CTA
    Contadores animados embaixo: "847 Veículos Vendidos" | "12 Anos de Mercado" | "98% Satisfação"
    (JS: contar de 0 até o valor com requestAnimationFrame ao entrar na tela)

[3] FILTROS — pills horizontais: [Todos] [SUVs] [Sedans] [Hatchbacks] [Esportivos] [Picapes]
    JS: cada card tem data-cat="suv" etc. Clique no filtro mostra/esconde cards com animação

[4] ESTOQUE — grid 4 colunas (2 no mobile) com 8 veículos reais:
    - Card 1: Toyota Corolla XEi 2.0 2023  | IMG_CAR_1 | data-cat="sedan"  | R$ 142.900 | 15.000 km
    - Card 2: Jeep Compass Limited 2023    | IMG_CAR_2 | data-cat="suv"    | R$ 189.900 | 8.500 km
    - Card 3: Ferrari 488 GTB 2020         | IMG_CAR_3 | data-cat="esportivo" | R$ 1.890.000 | 12.000 km
    - Card 4: BMW 320i Sport 2022          | IMG_CAR_4 | data-cat="sedan"  | R$ 249.900 | 22.000 km
    - Card 5: Chevrolet Camaro SS 2021     | IMG_CAR_5 | data-cat="esportivo" | R$ 389.900 | 18.000 km
    - Card 6: Ford Ranger XLT 2022         | IMG_CAR_6 | data-cat="picape"  | R$ 229.900 | 31.000 km
    - Card 7: Honda HR-V EXL 2022          | IMG_CAR_7 | data-cat="suv"    | R$ 159.900 | 19.000 km
    - Card 8: Hyundai HB20 1.0 Diamond 2023| IMG_CAR_8 | data-cat="hatch"  | R$ 89.900 | 5.200 km

    Cada card tem:
    - Foto com overflow:hidden e hover: transform scale(1.06) transition 0.4s
    - Badge colorido (DESTAQUE / NOVO / OPORTUNIDADE)
    - Nome completo, ano, km em tags, câmbio, combustível
    - Preço grande + parcela estimada em menor
    - 2 botões: [Ver Detalhes] e [WhatsApp ícone]
    - Card hover: translateY(-8px) + box-shadow maior

[5] MODAL — ativado pelo botão "Ver Detalhes":
    - overlay rgba(0,0,0,0.88) z-index:9999 fecha ao clicar
    - Conteúdo: foto grande do veículo, nome, preço
    - Grid 2 colunas de especificações (Motor, Potência, Câmbio, Tração, KM, Combustível, Cor, Portas, Ar-cond., Vidros elétricos)
    - Descrição vendedora do carro (2 parágrafos envolventes)
    - SIMULADOR DE FINANCIAMENTO:
        input range entrada (R$5.000 a R$80.000, mostra valor atualizado)
        select parcelas: 12 / 24 / 36 / 48 / 60 meses
        Cálculo em tempo real: parcela = (preco - entrada) * (0.018 / (1 - Math.pow(1.018, -meses)))
        Exibe: "Parcela estimada: R$ X.XXX,XX/mês"
    - 2 botões grandes: [💬 Falar com Vendedor] [📅 Agendar Test Drive]
    - Botão X para fechar, ESC fecha também
    - Abre/fecha com animação opacity + scale

[6] DIFERENCIAIS — 4 cards ícone SVG + título + texto:
    🛡 Procedência 100% | 💳 Financiamento Fácil | 🔧 Revisão Inclusa | 📞 Suporte Pós-Venda

[7] DEPOIMENTOS — 3 cards: nome, texto, ⭐⭐⭐⭐⭐

[8] CTA FINAL — banner gradiente com botão WhatsApp grande

[9] FOOTER — logo, links, redes sociais, copyright

CSS OBRIGATÓRIO:
- @import Google Fonts: Inter + Poppins
- :root com variáveis: --primary (cor forte do nicho), --dark (#0d0d0d ou similar), --card, --border
- @keyframes fadeUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
- @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
- IntersectionObserver aplicado em todos [data-anim] com animation-play-state:paused→running
- Delays escalonados 0s, 0.1s, 0.2s nos cards
- 100% responsivo com media queries

RETORNE APENAS ESTE JSON (sem markdown, sem explicação):
{"type":"site","html":"CÓDIGO HTML COMPLETO AQUI","message":"Seu site de revenda de carros está pronto! Veja o preview.","slug":"premium-motors","nome":"Premium Motors","nicho":"carros"}`;

// ─── PROMPT: BARBEARIA ───────────────────────────────────────────────────────
const PROMPT_BARBEARIA = `Você é um web designer especialista em barbearias modernas.
Crie um site HTML completo, escuro e masculino para uma barbearia premium.

FOTOS (USE APENAS ESTAS):
IMG_HERO = https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=90&fit=crop
IMG_S1   = https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=85&fit=crop
IMG_S2   = https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=85&fit=crop
IMG_G1   = https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=85&fit=crop
IMG_G2   = https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=85&fit=crop

ESTRUTURA: Navbar | Hero com IMG_HERO overlay escuro | Serviços (corte R$50, barba R$35, combo R$75) com duração e botão agendar |
Galeria de cortes | Sobre o barbeiro | Agendamento com formulário | Footer
ESTILO: fundo #0a0a0a, dourado #d4af37 como acento, fonte Oswald para títulos

RETORNE APENAS JSON sem markdown:
{"type":"site","html":"HTML COMPLETO","message":"Barbearia criada!","slug":"barbearia","nome":"NOME","nicho":"barbearia"}`;

// ─── PROMPT: PIZZARIA ────────────────────────────────────────────────────────
const PROMPT_PIZZARIA = `Você é um web designer especialista em restaurantes e pizzarias.
Crie um site HTML completo, quente e apetitoso para uma pizzaria.

FOTOS (USE APENAS ESTAS):
IMG_HERO = https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&q=90&fit=crop
IMG_P1   = https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=85&fit=crop
IMG_P2   = https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85&fit=crop
IMG_P3   = https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=85&fit=crop
IMG_P4   = https://images.unsplash.com/photo-1548369937-47519962c11a?w=800&q=85&fit=crop

ESTRUTURA: Navbar | Hero IMG_HERO overlay vermelho quente | Cardápio por tabs [Tradicionais][Especiais][Vegetarianas][Bebidas] |
Cards das pizzas com foto, ingredientes, tamanhos e preços | Countdown de promoção | Depoimentos | Footer com horários
ESTILO: vermelho #c0392b e laranja #e67e22, fonte Playfair Display para títulos

RETORNE APENAS JSON sem markdown:
{"type":"site","html":"HTML COMPLETO","message":"Pizzaria criada!","slug":"pizzaria","nome":"NOME","nicho":"pizzaria"}`;

// ─── PROMPT: GENÉRICO ────────────────────────────────────────────────────────
const PROMPT_GENERICO = `Você é um web designer expert de nível internacional.
Crie um site HTML completo, premium e profissional para o negócio descrito.

FILOSOFIA:
- Nunca entregue algo básico — sempre surpreenda
- Pense como especialista do nicho
- Maximize impacto visual e conversão
- Crie uma identidade de marca forte mesmo sem detalhes

FOTOS DISPONÍVEIS:
IMG_HERO = https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=90&fit=crop
IMG_2    = https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=85&fit=crop
IMG_3    = https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=85&fit=crop

ESTRUTURA: Navbar fixa | Hero impactante | Serviços/produtos em cards | Sobre | Depoimentos | Contato | Footer
CSS: Paleta adequada ao nicho, Google Fonts Inter, animações fadeUp com IntersectionObserver, 100% responsivo

RETORNE APENAS JSON sem markdown:
{"type":"site","html":"HTML COMPLETO","message":"Site criado!","slug":"SLUG","nome":"NOME","nicho":"negócio"}`;

function getPrompt(nicho: string, pedido: string): string {
  const map: Record<string, string> = {
    carros: PROMPT_CARROS,
    barbearia: PROMPT_BARBEARIA,
    pizzaria: PROMPT_PIZZARIA,
    restaurante: PROMPT_PIZZARIA.replace("pizzaria", "restaurante"),
  };
  const base = map[nicho] ?? PROMPT_GENERICO;
  return base + `\n\nPEDIDO DO USUÁRIO: "${pedido}"`;
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { messages } = await req.json();

  const lastUserMsg =
    [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";

  const isSiteRequest = /site|criar|fazer|montar|desenvolver|quero um|preciso de um|gera|cria/.test(
    lastUserMsg.toLowerCase()
  );

  if (!isSiteRequest) {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 300,
      messages: [
        { role: "system", content: 'Você é Vox, assistente de criação de sites. Seja amigável. Responda: {"type":"message","message":"resposta"}' },
        ...messages,
      ],
    });
    const t = res.choices[0]?.message?.content ?? "";
    try { const m = t.match(/\{[\s\S]*\}/); if (m) return NextResponse.json(JSON.parse(m[0])); } catch {}
    return NextResponse.json({ type: "message", message: t });
  }

  const nicho = detectarNicho(lastUserMsg);
  const systemPrompt = getPrompt(nicho, lastUserMsg);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: lastUserMsg },
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
