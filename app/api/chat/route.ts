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

// ─── PASSO 1: Identificar nicho e gerar brief de design ──────────────────────
const BRIEF_PROMPT = (pedido: string) => `
Você é um diretor criativo sênior de uma agência de design premiada internacionalmente.
O cliente pediu: "${pedido}"

Analise o pedido e entregue um BRIEF DE DESIGN completo em JSON:
{
  "nicho": "categoria do negócio",
  "nome_sugerido": "nome profissional para o negócio",
  "paleta": {
    "primaria": "#hexcode — cor principal da marca",
    "secundaria": "#hexcode — cor de apoio",
    "acento": "#hexcode — cor de destaque/CTA",
    "fundo": "#hexcode — fundo principal",
    "texto": "#hexcode — cor do texto"
  },
  "tipografia": {
    "titulo": "nome da fonte Google para títulos",
    "corpo": "nome da fonte Google para texto"
  },
  "estilo": "descrição do estilo visual (ex: moderno e sofisticado, rústico e acolhedor)",
  "secoes": ["lista", "das", "seções", "necessárias"],
  "diferenciais": ["diferencial 1", "diferencial 2", "diferencial 3"],
  "tom": "descrição do tom de voz (ex: profissional e confiável, jovem e dinâmico)",
  "fotos_necessarias": ["tipo de foto 1", "tipo de foto 2"]
}
Responda APENAS o JSON, sem markdown.`;

// ─── FOTOS UNSPLASH CURADAS POR CATEGORIA ───────────────────────────────────
const PHOTOS = {
  carros: [
    "https://images.unsplash.com/photo-1544636331-9849-4a36-9b4a-63b8d49e6234?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1580274455191-1c62282b1542?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1567818735868-e71b99932e29?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1621007947382-bb718bc42f1c?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1493238792000-8113da705763?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1471479917193-f00955256257?w=1400&q=90&fit=crop",
  ],
  barbearia: [
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=1400&q=90&fit=crop",
  ],
  pizzaria: [
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1548369937-47519962c11a?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1400&q=90&fit=crop",
  ],
  restaurante: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1400&q=90&fit=crop",
  ],
  academia: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1400&q=90&fit=crop",
  ],
  salao: [
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1560066984-138daaa0c2d4?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1400&q=90&fit=crop",
  ],
  clinica: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1400&q=90&fit=crop",
  ],
  imobiliaria: [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1400&q=90&fit=crop",
  ],
  generico: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1400&q=90&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=90&fit=crop",
  ],
};

// ─── SYSTEM PROMPT PRINCIPAL ─────────────────────────────────────────────────
const buildSystemPrompt = (briefJson: string, pedido: string) => `
Você é ARIA — a melhor web designer e engenheira front-end do mundo. Seus sites ganham prêmios Awwwards e fazem clientes comprarem na hora que abrem.

PEDIDO DO CLIENTE: "${pedido}"

BRIEF DE DESIGN:
${briefJson}

═══════════════════════════════════════════════════════════
PADRÃO DE QUALIDADE EXIGIDO: NÍVEL APPLE.COM + AWWWARDS
═══════════════════════════════════════════════════════════
O cliente deve abrir o site e pensar: "Nossa, que profissionalismo — preciso comprar isso agora."
NÃO é um template genérico. É um site que parece custar R$ 15.000 feito por agência.

REGRAS INVIOLÁVEIS:
✗ NUNCA use Lorem ipsum
✗ NUNCA invente URLs de foto — use SOMENTE as URLs da lista abaixo
✗ NUNCA use placeholder como [Nome da empresa]
✗ NUNCA crie sites com menos de 900 linhas de HTML
✗ NUNCA omita animações
✗ NUNCA use design genérico — cada site deve parecer feito sob medida

═══════════════════════════════════════════════════════════
FOTOS APROVADAS — USE SOMENTE ESTAS:
═══════════════════════════════════════════════════════════
CARROS/VEÍCULOS:
${PHOTOS.carros.map((u, i) => `  [CAR-${i + 1}] ${u}`).join("\n")}

BARBEARIA:
${PHOTOS.barbearia.map((u, i) => `  [BAR-${i + 1}] ${u}`).join("\n")}

PIZZARIA/COMIDA:
${PHOTOS.pizzaria.map((u, i) => `  [PIZ-${i + 1}] ${u}`).join("\n")}

RESTAURANTE:
${PHOTOS.restaurante.map((u, i) => `  [RES-${i + 1}] ${u}`).join("\n")}

ACADEMIA/FITNESS:
${PHOTOS.academia.map((u, i) => `  [GYM-${i + 1}] ${u}`).join("\n")}

SALÃO DE BELEZA:
${PHOTOS.salao.map((u, i) => `  [SAL-${i + 1}] ${u}`).join("\n")}

CLÍNICA/SAÚDE:
${PHOTOS.clinica.map((u, i) => `  [CLI-${i + 1}] ${u}`).join("\n")}

IMOBILIÁRIA:
${PHOTOS.imobiliaria.map((u, i) => `  [IMO-${i + 1}] ${u}`).join("\n")}

GENÉRICO/ESCRITÓRIO:
${PHOTOS.generico.map((u, i) => `  [GEN-${i + 1}] ${u}`).join("\n")}

═══════════════════════════════════════════════════════════
ANIMAÇÕES OBRIGATÓRIAS — INCLUA TUDO ISSO:
═══════════════════════════════════════════════════════════
No <style>, inclua TODOS estes keyframes:

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(50px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes slideRight {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideLeft {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes shimmer {
  from { background-position: -200% center; }
  to   { background-position: 200% center; }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.3); }
  50%       { box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.6); }
}
@keyframes count-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

No <script>, inclua o Intersection Observer para ativar animações ao rolar:

const observer = new IntersectionObserver((entries) => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.style.animationPlayState = 'running';
      el.target.classList.add('visible');
      observer.unobserve(el.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('[data-anim]').forEach(el => {
  el.style.animationPlayState = 'paused';
  observer.observe(el);
});

Aplique data-anim em TODOS os cards, seções, títulos e imagens assim:
<div data-anim style="animation: fadeUp 0.7s ease forwards; animation-play-state: paused;">

Delays escalonados em cards (0s, 0.1s, 0.2s, 0.3s...) para efeito cascata.

═══════════════════════════════════════════════════════════
DESIGN SYSTEM OBRIGATÓRIO:
═══════════════════════════════════════════════════════════
No :root, defina variáveis CSS baseadas no brief:
- Cores do brief (primaria, secundaria, acento, fundo, texto)
- --shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
- --radius-sm (4px), --radius-md (12px), --radius-lg (20px), --radius-xl (32px)
- --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
- Gradientes derivados das cores principais

Tipografia via Google Fonts com @import no topo do style.
Hierarquia: h1 (56-72px bold), h2 (36-48px semibold), h3 (24-30px medium), body (16-18px regular).
Use clamp() para tamanhos responsivos: font-size: clamp(36px, 5vw, 72px)

═══════════════════════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA POR NICHO:
═══════════════════════════════════════════════════════════

▌REVENDA DE CARROS / CONCESSIONÁRIA:
Hero:
  - Foto full-screen do melhor carro [CAR-1] com overlay gradiente escuro
  - Título impactante: "Os Melhores Carros. O Melhor Preço."
  - Subtítulo com proposta de valor
  - 2 CTAs: [Ver Estoque] [Falar no WhatsApp]
  - Contador animado: X Carros Disponíveis | X Clientes Satisfeitos | X Anos de Mercado

Filtros de estoque:
  - Botões: [Todos] [SUVs] [Sedans] [Hatchbacks] [Esportivos] [Picapes]
  - Visual de pills com cor de destaque no ativo

Grid de carros (mínimo 6 veículos REAIS com marca/modelo/ano):
  - Card sofisticado com:
    * Foto do carro com hover zoom (transform: scale(1.05))
    * Badge colorido: "DESTAQUE", "NOVO ESTOQUE", "OPORTUNIDADE"
    * Nome completo: Toyota Corolla XEi 2023
    * Km rodados, câmbio, combustível como tags/badges
    * Preço em destaque com cor de acento
    * Preço parcelado menor embaixo
    * 2 botões: [Ver Detalhes] [WhatsApp] com ícones
    * Efeito hover: card sobe levemente (translateY(-6px) + sombra maior)

Modal de detalhes do veículo (obrigatório, ativado pelo botão Ver Detalhes):
  - Overlay escuro com blur
  - Carrossel de 3 fotos do veículo (next/prev com arrows)
  - Nome, ano, preço em destaque
  - Grid de especificações técnicas:
    * Motor, Potência, Câmbio, Tração
    * Km, Combustível, Cor, Portas
    * Ar condicionado, Direção, Vidros elétricos, etc.
  - Descrição vendedora do carro (2-3 parágrafos)
  - Simulador de financiamento:
    * Slider de entrada (de R$5k a R$50k)
    * Selector de parcelas (12, 24, 36, 48, 60 meses)
    * Cálculo JS em tempo real: parcela = (preco - entrada) * (taxa / (1 - Math.pow(1+taxa, -meses)))
  - 2 CTAs grandes: [Falar com Vendedor no WhatsApp] [Agendar Test Drive]
  - Fechar com X ou clicando no overlay

Seção Por que nos escolher: 4 cards com ícone + título + descrição
  - Procedência garantida | Financiamento facilitado | Revisão inclusa | Suporte pós-venda

Depoimentos: 3 cards com foto (use imagens de people do Unsplash), nome, cargo, texto, estrelas

CTA Final: banner com gradiente + botão WhatsApp grande

▌BARBEARIA:
Hero cinematográfico com foto [BAR-1], overlay gradiente, fonte masculina/bold
Serviços em cards com foto, nome, preço, duração, botão agendar
Galeria de cortes (grid masonry com fotos [BAR-2..7])
Sobre o barbeiro com foto e história
Agendamento com formulário estilizado
Instagram feed simulado (grid 3x2 de fotos)

▌PIZZARIA:
Hero com foto de pizza [PIZ-1] em close, overlay vermelho/quente
Menu por categoria: [Tradicionais] [Especiais] [Vegetarianas] [Bebidas]
Cards de pizza com foto circular ou retangular, ingredientes, preço, botão pedir
Seção de promoções com countdown timer animado
Depoimentos com estrelas
Rodapé com mapa/endereço e horários

▌RESTAURANTE:
Hero elegante [RES-1], paleta sofisticada
Menu degustação em accordion ou tabs
Galeria de pratos (grid com hover overlay)
Reservas online (formulário)
Chef section com foto e história

▌ACADEMIA:
Hero impactante [GYM-1] com overlay escuro e headline motivacional
Planos em cards com destaque no intermediário (popular)
Modalidades em tabs com foto e descrição
Galeria de equipamentos
Depoimentos de alunos com before/after visual

▌SALÃO DE BELEZA:
Hero elegante [SAL-1], paleta feminina sofisticada
Serviços com fotos, preços, tempo estimado
Galeria de transformações
Equipe com cards de cada profissional
Agendamento online

▌CLÍNICA:
Hero clean [CLI-1], paleta azul/verde confiança
Especialidades em cards com ícone médico
Equipe médica com fotos e CRM
Planos de saúde aceitos
Agendamento de consulta

▌IMOBILIÁRIA:
Hero com busca de imóveis integrada [IMO-1]
Grid de imóveis com fotos, m², quartos, vagas, preço
Mapa placeholder
Calculadora de financiamento
Equipe de corretores

▌GENÉRICO (quando não identificar nicho específico):
Aplique o brief de design recebido e crie um site institucional premium com:
Hero impactante, Serviços/Produtos, Sobre, Depoimentos, Contato

═══════════════════════════════════════════════════════════
INTERAÇÕES JAVASCRIPT OBRIGATÓRIAS:
═══════════════════════════════════════════════════════════
1. Navbar: fixa, muda background ao rolar (scrollY > 60 → background sólido + sombra)
2. Filtros: data-cat nos cards, botões toggleam active + filtram com animação
3. Modal: abre/fecha com tecla Escape + click no overlay
4. Carrossel: prev/next com transição suave, swipe touch no mobile
5. Contadores animados: ao entrar na tela, numeros sobem de 0 até o valor com requestAnimationFrame
6. Smooth scroll para âncoras
7. Mobile: menu hamburguer funcional com animação de abertura/fechamento
8. Simulador de financiamento (se for loja/carro): cálculo em tempo real
9. Hover nos cards: translateY(-6px) + box-shadow aumentada

═══════════════════════════════════════════════════════════
RESPONSIVIDADE:
═══════════════════════════════════════════════════════════
- Mobile-first com media queries
- Grid: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
- Navbar collapsa em hamburguer abaixo de 768px
- Hero: font-size menor no mobile, padding ajustado
- Modais: full-screen no mobile

═══════════════════════════════════════════════════════════
FORMATO DE SAÍDA — APENAS JSON, SEM MARKDOWN:
═══════════════════════════════════════════════════════════
Para site:
{"type":"site","html":"HTML COMPLETO (escape \\\" dentro de strings JS)","message":"Pronto! Seu site ficou incrível. Veja o preview ao lado — quando quiser publicar com domínio .com, clique em Publicar.","slug":"slug-do-negocio","nome":"Nome do Negócio","nicho":"tipo do negócio"}

Para proposta:
{"type":"proposal","title":"título","items":["item1","item2"],"deadline":"X dias","price":"R$ X.XXX","message":"resumo"}

Para conversa normal:
{"type":"message","message":"resposta em português"}

RESPONDA SEMPRE EM PORTUGUÊS BRASILEIRO.
O HTML deve ser COMPLETO — do <!DOCTYPE html> ao </html> — sem cortes.`;

// ─── DETECTAR NICHO ──────────────────────────────────────────────────────────
function detectarNicho(texto: string): string {
  const t = texto.toLowerCase();
  if (/carr[oa]|veícul|concession|automóv|sedan|suv|pick.?up|moto|frota/.test(t)) return "carros";
  if (/barbearia|barbeiro|barba|cabelo masculino|barbeir/.test(t)) return "barbearia";
  if (/pizzaria|pizza|pizz/.test(t)) return "pizzaria";
  if (/restaurante|gastronomi|culinár|cardápio|chef/.test(t)) return "restaurante";
  if (/academia|fitness|musculação|crossfit|ginástica|personal/.test(t)) return "academia";
  if (/salão|beleza|estética|manicure|cabeleireira|spa/.test(t)) return "salao";
  if (/clínica|médico|saúde|dentista|psicólog|fisio|consulta/.test(t)) return "clinica";
  if (/imobiliária|imóvel|apartamento|casa|corretor|aluguel/.test(t)) return "imobiliaria";
  return "generico";
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { messages } = await req.json();

  const lastUserMsg =
    [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";

  // Verificar se é pedido de site
  const isSiteRequest = /site|criar|fazer|montar|desenvolver|quero um|preciso de um|gera|cria/.test(
    lastUserMsg.toLowerCase()
  );

  if (!isSiteRequest) {
    // Conversa normal
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            'Você é Vox, um assistente criativo especialista em criar sites profissionais. Seja amigável e direto. Responda em JSON: {"type":"message","message":"sua resposta"}',
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

  // ── Passo 1: Gerar brief de design ──────────────────────────────────────
  let briefJson = "{}";
  try {
    const briefRes = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 600,
      temperature: 0.8,
      messages: [{ role: "user", content: BRIEF_PROMPT(lastUserMsg) }],
    });
    const briefText = briefRes.choices[0]?.message?.content ?? "";
    const m = briefText.match(/\{[\s\S]*\}/);
    if (m) briefJson = m[0];
  } catch {}

  // ── Passo 2: Gerar HTML do site ──────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(briefJson, lastUserMsg);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16000,
    temperature: 0.85,
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
        const slug = parsed.slug
          ? slugify(parsed.slug)
          : slugify(parsed.nome ?? "meu-site");
        const senha = gerarSenha();

        createSite({
          slug,
          nicho: parsed.nicho ?? detectarNicho(lastUserMsg),
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
