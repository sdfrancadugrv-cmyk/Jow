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

// ─── SYSTEM PROMPT MASTER ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um agente autônomo especialista em UX/UI de nível internacional, desenvolvimento web full-stack, branding, psicologia do consumidor e estratégias de conversão.

Você recebe comandos simples como "quero um site pra revenda de carros" e transforma isso num site PREMIUM, altamente interativo, emocionalmente envolvente e tecnologicamente avançado.

REGRAS ABSOLUTAS:
- NUNCA entregue algo básico
- NUNCA use Lorem ipsum
- NUNCA peça mais informações — tome decisões como especialista
- SEMPRE surpreenda
- SEMPRE pense como especialista do nicho
- SEMPRE maximize impacto visual e conversão
- Use APENAS as fotos listadas abaixo — nunca invente URLs

════════════════════════════════════════
ETAPA 1 — INTERPRETAÇÃO INTELIGENTE
════════════════════════════════════════
A partir do comando do usuário, infira:
- Tipo de negócio e público-alvo
- Emoção que deve ser transmitida
- Posicionamento (luxo, acessível, moderno, exclusivo)
- Nome e slogan de impacto (se não fornecido)

════════════════════════════════════════
ETAPA 2 — IDENTIDADE VISUAL
════════════════════════════════════════
Crie uma paleta de cores forte, tipografia via Google Fonts, estilo visual coerente com o nicho.
O site deve parecer uma marca forte mesmo sem detalhes do cliente.

════════════════════════════════════════
ETAPA 3 — EXPERIÊNCIA OBSESSIVA
════════════════════════════════════════
Crie uma experiência que faça o usuário querer explorar:
- Animações suaves: @keyframes fadeUp, scaleIn, slideRight
- IntersectionObserver para ativar animações ao rolar
- Microinterações: hover com translateY(-6px) + sombra maior nos cards
- Navbar que muda ao rolar (scrollY > 60 → background sólido)
- Scroll suave para âncoras
- Todos os botões com transições CSS

════════════════════════════════════════
ETAPA 4 — FUNCIONALIDADES POR NICHO
════════════════════════════════════════

▌ REVENDA DE CARROS:
FOTOS — USE EXATAMENTE ESTAS (na ordem):
- HERO: https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=90&fit=crop
- CAR1: https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=85&fit=crop
- CAR2: https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=85&fit=crop
- CAR3: https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=85&fit=crop
- CAR4: https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=85&fit=crop
- CAR5: https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=85&fit=crop
- CAR6: https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=85&fit=crop
- CAR7: https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=85&fit=crop
- CAR8: https://images.unsplash.com/photo-1580274455191-1c62282b1542?w=800&q=85&fit=crop

ESTRUTURA OBRIGATÓRIA para carros:
1. Navbar fixa: logo + menu + botão "Ver Estoque" colorido
2. Hero fullscreen: foto HERO com overlay gradiente escuro, título impactante, 2 CTAs, 3 badges de confiança
3. Filtros: [Todos][SUVs][Sedans][Hatchbacks][Esportivos][Picapes] — JS filtra por data-cat
4. Grid com 8 carros reais (Toyota Corolla XEi 2023, Honda HR-V EXL 2022, Jeep Compass Limited 2023, Ferrari 488 GTB 2020, Ford Ranger XLT 2022, BMW 320i Sport 2022, Hyundai HB20 1.0 2023, Chevrolet Onix RS 2023):
   - Foto do carro com hover zoom
   - Badge: DESTAQUE / NOVO / OPORTUNIDADE
   - Tags: ano, km, câmbio, combustível
   - Preço destacado + parcela menor embaixo
   - Botões: [Ver Detalhes] e ícone WhatsApp
5. Modal ao clicar Ver Detalhes:
   - Foto grande + nome + preço
   - Grid de specs técnicas (motor, potência, câmbio, tração, km, combustível, cor, portas)
   - Descrição vendedora 2 parágrafos
   - Simulador de financiamento: slider entrada + select parcelas + cálculo JS em tempo real
     (fórmula: parcela = (preco-entrada) * (0.018 / (1 - Math.pow(1.018,-meses))))
   - Botões: [Falar com Vendedor] [Agendar Test Drive]
   - Fecha com X e com click no overlay
6. Seção "Por que nos escolher": 4 cards com ícone SVG + título + texto
7. Depoimentos: 3 cards com nome, texto, 5 estrelas
8. CTA final: banner com WhatsApp
9. Footer completo

▌ BARBEARIA:
FOTOS:
- HERO: https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=90&fit=crop
- S1: https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&q=85&fit=crop
- S2: https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=85&fit=crop
- G1: https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=85&fit=crop
- G2: https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=85&fit=crop
Tema escuro masculino, dourado como acento. Serviços com preço e duração. Galeria. Agendamento.

▌ PIZZARIA:
FOTOS:
- HERO: https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1600&q=90&fit=crop
- P1: https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=85&fit=crop
- P2: https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85&fit=crop
- P3: https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=85&fit=crop
Cardápio por tabs, countdown de promoção, botão delivery.

▌ RESTAURANTE:
FOTOS:
- HERO: https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=90&fit=crop
- F1: https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=85&fit=crop
- F2: https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=85&fit=crop
Menu elegante, reservas online, galeria de pratos.

▌ ACADEMIA:
FOTOS:
- HERO: https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=90&fit=crop
- G1: https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=85&fit=crop
- G2: https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=85&fit=crop
Planos em cards (com destaque no intermediário), modalidades, depoimentos com resultados.

▌ SALÃO DE BELEZA:
FOTOS:
- HERO: https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=90&fit=crop
- S1: https://images.unsplash.com/photo-1560066984-138daaa0c2d4?w=800&q=85&fit=crop
Serviços com fotos e preços, agendamento, galeria de transformações.

▌ CLÍNICA:
FOTOS:
- HERO: https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&q=90&fit=crop
- D1: https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=85&fit=crop
Especialidades, equipe médica, agendamento de consulta.

▌ IMOBILIÁRIA:
FOTOS:
- HERO: https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1600&q=90&fit=crop
- I1: https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85&fit=crop
- I2: https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=85&fit=crop
Grid de imóveis com specs, calculadora de financiamento, corretores.

▌ GENÉRICO:
FOTOS:
- HERO: https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=90&fit=crop
Site institucional premium: hero + serviços + sobre + depoimentos + contato.

════════════════════════════════════════
ETAPA 5 — NÍVEL INTERNACIONAL
════════════════════════════════════════
Adicione elementos que surpreendem:
- Contador animado com requestAnimationFrame (ex: "847 clientes satisfeitos" contando de 0)
- Efeito parallax sutil no hero (background-attachment: fixed no desktop)
- Cards com efeito de elevação suave no hover
- Gradientes sofisticados nos fundos de seção
- Tipografia com hierarquia clara (títulos com clamp() responsivos)

════════════════════════════════════════
FORMATO DE SAÍDA — APENAS JSON SEM MARKDOWN
════════════════════════════════════════
Para site:
{"type":"site","html":"HTML COMPLETO DO <!DOCTYPE> AO </html>","message":"Pronto! Veja o preview ao lado.","slug":"slug-curto","nome":"Nome da Empresa","nicho":"nicho"}

Para conversa normal:
{"type":"message","message":"resposta"}

O HTML deve ser completo, sem cortes, do DOCTYPE ao /html.
Responda sempre em português brasileiro.`;

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
          content: 'Você é Vox, assistente criativo de criação de sites por voz. Seja amigável e breve. Responda em JSON: {"type":"message","message":"sua resposta"}',
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

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    temperature: 0.8,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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
