"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useJow, unlockJowAudio, stopJowAudio } from "@/hooks/useJow";
import { useJowStore } from "@/stores/jowStore";


type VideoInfo = { type: "youtube" | "drive"; id: string; shorts: boolean };

function extractVideoInfo(url: string): VideoInfo | null {
  if (!url?.trim()) return null;
  // Marca manual de vertical: qualquer URL com #shorts ou #vertical
  const isVertical = /#shorts|#vertical/i.test(url);
  const cleanUrl = url.replace(/#.*/g, "");
  // YouTube Shorts (URL nativa)
  const shorts = cleanUrl.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts) return { type: "youtube", id: shorts[1], shorts: true };
  // YouTube normal
  const yt = cleanUrl.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type: "youtube", id: yt[1], shorts: isVertical };
  // Google Drive
  const drive = cleanUrl.match(/\/d\/([\w-]+)/);
  if (drive) return { type: "drive", id: drive[1], shorts: false };
  return null;
}

function videoEmbedUrl(v: VideoInfo): string {
  if (v.type === "youtube") return `https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1`;
  return `https://drive.google.com/file/d/${v.id}/preview`;
}

function driveImageUrl(link: string): string {
  const match = link.match(/\/d\/([\w-]+)/);
  if (!match) return link;
  const id = match[1];
  // lh3.googleusercontent.com é mais confiável para imagens em <img> tags
  return `https://lh3.googleusercontent.com/d/${id}`;
}

interface Estrutura {
  tema?: { cor_primaria?: string; cor_acento?: string; estilo?: string; emoji?: string };
  headline?: string;
  subheadline?: string;
  transformacao?: string;
  prova_social?: string;
  urgencia?: string;
  publico?: string;
  proposta?: string;
  dores?: string[];
  beneficios?: string[];
  objecoes?: Array<{ objecao: string; rebate: string }>;
  cta?: string;
  abertura?: string;
  gatilhos?: string[];
  quando_usar_video?: string;
  prompt_vendas?: string;
}

interface OpcaoProduto {
  nome: string;
  descricao: string;
  preco: string;
  precoNum: number;
  comissao: number;
}

interface Produto {
  nome: string;
  preco: string;
  imageLinks: string[];
  videoLinks: string[];
  salesLink: string;
  estrutura: Estrutura;
  template?: string;
  permitirAfiliados?: boolean;
  modalidadeVenda?: string;
  whatsappContato?: string;
  pixKey?: string;
  opcoes?: OpcaoProduto[];
}

// Paletas por estilo — fallback se a IA não gerar cores válidas
function buildTheme(e: Estrutura) {
  const t = e.tema || {};
  const estilo = t.estilo || "premium";
  const presets: Record<string, { bg: string; surface: string; border: string; text: string; muted: string }> = {
    urgente:    { bg: "#0F0404", surface: "rgba(255,60,40,0.06)",   border: "rgba(255,80,60,0.25)",  text: "#FFB5A0", muted: "#8A4030" },
    energetico: { bg: "#030812", surface: "rgba(40,120,255,0.06)",  border: "rgba(60,140,255,0.22)", text: "#A0C8FF", muted: "#305080" },
    confianca:  { bg: "#030F07", surface: "rgba(30,180,80,0.06)",   border: "rgba(50,200,100,0.22)", text: "#90EAB0", muted: "#205040" },
    premium:    { bg: "#070B18", surface: "rgba(212,160,23,0.05)",  border: "rgba(212,160,23,0.18)", text: "#C8B070", muted: "#7A6018" },
  };
  const p = presets[estilo] || presets.premium;
  const cor1 = t.cor_primaria || "#D4A017";
  const cor2 = t.cor_acento   || "#E8C040";
  return { ...p, cor1, cor2, estilo, emoji: t.emoji || "⚡" };
}

export default function PaginaVendas({ params }: { params: { slug: string } }) {
  const { speak, transcribe } = useJow();
  const jowState = useJowStore(s => s.state);
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatAberto,   setChatAberto]   = useState(false);
  const [audioAtivado, setAudioAtivado] = useState(false);
  const [imgAtiva, setImgAtiva] = useState(0);
  const [videoAssistido, setVideoAssistido] = useState(false);
  const [mensagens, setMensagens] = useState<Array<{ role: string; content: string }>>([]);
  const [gravando,  setGravando]  = useState(false);
  const [pensando,  setPensando]  = useState(false);
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [whatsappNum,   setWhatsappNum]   = useState("");
  const [showSticky, setShowSticky] = useState(false);

  // Afiliado — dados do revendedor quando acessado via ?ref=
  const [afiliadoWpp, setAfiliadoWpp] = useState<string | null>(null);

  // Modal de cadastro de afiliado
  const [revendaModal, setRevendaModal]   = useState(false);
  const [revendaNome,  setRevendaNome]    = useState("");
  const [revendaWpp,   setRevendaWpp]     = useState("");
  const [revendando,   setRevendando]     = useState(false);
  const [revendaLink,  setRevendaLink]    = useState("");

  // Modal de pedido de instalação
  const [pedidoModal,  setPedidoModal]    = useState(false);
  const [pedidoStep,   setPedidoStep]     = useState<"form"|"pix"|"ok">("form");
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<OpcaoProduto | null>(null);
  const [pedidoNome,   setPedidoNome]     = useState("");
  const [pedidoTel,    setPedidoTel]      = useState("");
  const [pedidoEnd,    setPedidoEnd]      = useState("");
  const [pedidoEnviando, setPedidoEnviando] = useState(false);
  const [pedidoPix,    setPedidoPix]      = useState<{ pixKey: string; valor: string } | null>(null);
  const [pixCopiado,   setPixCopiado]     = useState(false);
  const mediaRef       = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const heroRef    = useRef<HTMLDivElement>(null);
  const pensandoRef    = useRef(false);
  const gravandoRef    = useRef(false);
  const prevJowState   = useRef("idle");
  const ouvirAposVoz   = useRef(false);
  const aberturaRef    = useRef("");

  // Load product
  useEffect(() => {
    fetch(`/api/vendedor/produto/${params.slug}`)
      .then(r => r.json())
      .then(d => { setProduto(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.slug]);

  // Se a página foi acessada via link de afiliado, busca o WhatsApp do revendedor
  useEffect(() => {
    if (!refCode) return;
    fetch(`/api/afiliado/${refCode}/dashboard`)
      .then(r => r.json())
      .then(d => { if (d.afiliado?.whatsapp) setAfiliadoWpp(d.afiliado.whatsapp); })
      .catch(() => {});
  }, [refCode]);

  async function enviarPedido() {
    if (!pedidoNome.trim() || !pedidoTel.trim() || !pedidoEnd.trim()) return;
    setPedidoEnviando(true);
    try {
      const afiliadoId = refCode
        ? await fetch(`/api/afiliado/${refCode}/dashboard`).then(r => r.json()).then(d => d.afiliado?.id).catch(() => null)
        : null;
      const res = await fetch("/api/pedido/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: params.slug, nome: pedidoNome, telefone: pedidoTel, endereco: pedidoEnd, afiliadoId, opcaoNome: opcaoSelecionada?.nome, comissao: opcaoSelecionada?.comissao, valorOpcao: opcaoSelecionada?.preco }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "Erro ao enviar pedido"); return; }
      setPedidoPix({ pixKey: d.pixKey || "", valor: d.valor });
      setPedidoStep("pix");
    } catch {
      alert("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setPedidoEnviando(false);
    }
  }

  function fecharPedidoModal() {
    setPedidoModal(false);
    setPedidoStep("form");
    setPedidoNome(""); setPedidoTel(""); setPedidoEnd("");
    setPedidoPix(null); setPixCopiado(false);
    setOpcaoSelecionada(null);
  }

  function abrirPedidoComOpcao(opcao: OpcaoProduto) {
    setOpcaoSelecionada(opcao);
    setPedidoModal(true);
  }

  async function cadastrarAfiliado() {
    if (!revendaNome.trim() || !revendaWpp.trim()) return;
    setRevendando(true);
    try {
      const res = await fetch("/api/afiliado/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: params.slug, nome: revendaNome.trim(), whatsapp: revendaWpp }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "Erro ao cadastrar"); return; }
      setRevendaLink(d.dashboardLink);
    } catch {
      alert("Erro ao cadastrar. Tente novamente.");
    } finally {
      setRevendando(false);
    }
  }

  // Sticky header on scroll
  useEffect(() => {
    const onScroll = () => {
      const h = heroRef.current?.offsetHeight || 400;
      setShowSticky(window.scrollY > h * 0.7);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens, pensando]);

  // Só ouve quando Kadosh realmente parou de falar (speaking → idle)
  useEffect(() => {
    if (prevJowState.current === "speaking" && jowState === "idle" && ouvirAposVoz.current) {
      ouvirAposVoz.current = false;
      const t = setTimeout(() => iniciarOuvindoAuto(), 1200); // 1.2s para eco dissipar
      return () => clearTimeout(t);
    }
    prevJowState.current = jowState;
  }, [jowState]); // eslint-disable-line

  // Abertura: salva o texto; a fala só começa quando o usuário toca na barra
  useEffect(() => {
    if (!produto) return;
    const nomeP = produto.nome;
    const abertura = produto.estrutura?.abertura
      || `Olá! Eu sou o Kadosh. Podemos conversar por voz audível. Sou capaz de compreender, raciocinar, tirar suas dúvidas e te conduzir por toda essa experiência inovadora de atendimento virtual.`;
    aberturaRef.current = abertura;
    setMensagens([{ role: "assistant", content: abertura }]);
  }, [produto]); // eslint-disable-line

  const speakSafe = useCallback(async (text: string) => {
    if (false) return;
    await speak(text);
  }, [speak]);

  // Ativa o Kadosh no primeiro toque do usuário (respeita política de autoplay)
  async function ativarKadosh() {
    if (audioAtivado) return;
    setAudioAtivado(true);
    unlockJowAudio();
    const texto = aberturaRef.current;
    if (texto) {
      ouvirAposVoz.current = true;
      speak(texto).catch(() => { ouvirAposVoz.current = false; });
    }
  }

  // Para microfone e voz, mas mantém a conversa visível
  function encerrarConversa() {
    mediaRef.current?.stop();
    gravandoRef.current = false;
    pensandoRef.current = false;
    ouvirAposVoz.current = false;
    setGravando(false);
    setPensando(false);
    stopJowAudio();
  }

  // Ouvir automaticamente com detecção de silêncio e echo cancellation
  async function iniciarOuvindoAuto() {
    if (gravandoRef.current || pensandoRef.current || false || jowState === "speaking") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // getUserMedia = interação do usuário — desbloqueia áudio agora
      unlockJowAudio();

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source   = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      let hasVoice = false;
      const startTime = Date.now();

      gravandoRef.current = true;
      setGravando(true);

      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        try { audioCtx.close(); } catch {}
        gravandoRef.current = false;
        setGravando(false);
        if (!hasVoice || chunksRef.current.length === 0) return;
        const blob  = new Blob(chunksRef.current, { type: "audio/webm" });
        const texto = await transcribe(blob);
        if (texto.trim()) {
          unlockJowAudio(); // garante áudio desbloqueado antes de falar
          await enviarMensagem(texto);
        } else { setTimeout(() => iniciarOuvindoAuto(), 400); }
      };
      rec.start(100);
      mediaRef.current = rec;

      // Detecção de silêncio
      const WARMUP_MS   = 1500; // ignora tudo nos primeiros 1.5s (eco residual + adaptação)
      const THRESHOLD   = 42;   // threshold alto para ignorar ruído de fundo
      const MIN_VOZ_MS  = 900;  // mínimo de 0.9s de fala
      const SILENCIO_MS = 2000; // 2s de silêncio para encerrar

      const tick = () => {
        if (!mediaRef.current || mediaRef.current.state !== "recording") return;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const elapsed = Date.now() - startTime;

        // Período de warmup: ignora qualquer áudio (eco residual)
        if (elapsed < WARMUP_MS) { requestAnimationFrame(tick); return; }

        if (avg > THRESHOLD) {
          hasVoice = true;
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        } else if (hasVoice && elapsed > MIN_VOZ_MS && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            mediaRef.current?.stop();
          }, SILENCIO_MS);
        } else if (!hasVoice && elapsed > 12000) {
          // 12s sem voz alguma → desiste
          mediaRef.current?.stop();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

    } catch (err) {
      console.warn("[VENDEDOR] microfone:", err);
      gravandoRef.current = false;
      setGravando(false);
    }
  }

  async function enviarMensagem(texto: string) {
    if (!texto.trim() || pensandoRef.current) return;
    const novas = [...mensagens, { role: "user", content: texto }];
    setMensagens(novas);
    pensandoRef.current = true;
    setPensando(true);
    try {
      const res  = await fetch("/api/vendedor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: params.slug, mensagens: novas, videoAssistido }),
      });
      const data = await res.json();
      const resposta = data.resposta || "Pode repetir?";
      const acao    = data.acao;
      setMensagens(prev => [...prev, { role: "assistant", content: resposta }]);
      if (!false) {
        ouvirAposVoz.current = true;
        await speak(resposta).catch(() => { ouvirAposVoz.current = false; });
      }
      if (acao === "REPRODUZIR_VIDEO") {
        // scroll até os vídeos para que o usuário os veja
        document.querySelector("iframe")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      if (acao === "PEDIR_WHATSAPP")  setTimeout(() => setWhatsappModal(true), 1200);
      if (acao === "IR_PARA_COMPRA" && produto?.salesLink) setTimeout(() => window.open(produto.salesLink, "_blank"), 900);
    } catch {
      setMensagens(prev => [...prev, { role: "assistant", content: "Desculpa, tive um problema aqui. Pode repetir?" }]);
      setTimeout(() => iniciarOuvindoAuto(), 1500);
    } finally {
      pensandoRef.current = false;
      setPensando(false);
    }
  }

  async function salvarWhatsapp() {
    if (!whatsappNum.trim()) return;
    setWhatsappModal(false);
    await speakSafe("Perfeito. Vou te mandar tudo no WhatsApp. Qualquer dúvida, só me chama.");
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", background: "#070B18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(212,160,23,0.15)", borderTopColor: "#D4A017", animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  if (!produto) return (
    <main style={{ minHeight: "100vh", background: "#070B18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#7A6018" }}>Página não encontrada.</p>
    </main>
  );

  const isProf = produto.template === "profissional";
  const e  = produto.estrutura;
  const th = buildTheme(e);
  const imagens = produto.imageLinks.filter(Boolean);
  const videos  = (produto.videoLinks || []).map(url => extractVideoInfo(url)).filter(Boolean) as VideoInfo[];

  return (
    <main style={{ minHeight: "100vh", background: th.bg, fontFamily: "'Inter', system-ui, sans-serif", color: th.text }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse   { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }
        @keyframes glow    { 0%,100%{box-shadow:0 0 20px ${th.cor1}55} 50%{box-shadow:0 0 45px ${th.cor1}99} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slidein { from{opacity:0;transform:translateY(60px)} to{opacity:1;transform:translateY(0)} }
        .fade-up  { animation: fadeUp 0.5s ease forwards; }
        .orb-anim { animation: pulse 2.8s ease-in-out infinite, glow 2.8s ease-in-out infinite; }
        .dot-blink { animation: blink 1.1s ease-in-out infinite; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${th.cor1}40; border-radius: 4px; }
      `}</style>

      {/* ── STICKY BAR ── */}
      {showSticky && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 80,
          background: th.bg + "F2", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${th.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", gap: 12,
        }}>
          <span style={{ color: th.cor1, fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{produto.nome}</span>
          <a
            href={produto.salesLink} target="_blank" rel="noopener noreferrer"
            style={{
              flexShrink: 0, padding: "9px 22px", borderRadius: 50,
              background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`,
              color: "#060606", fontWeight: 800, fontSize: 12, letterSpacing: "0.08em",
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            {e.cta || "COMPRAR AGORA"}
          </a>
        </div>
      )}

      {/* ══ TEMPLATE PROFISSIONAL ══ */}
      {isProf && (
        <>
          <section ref={heroRef} style={{ padding: "80px 20px 60px", maxWidth: 820, margin: "0 auto" }}>
            {e.publico && (
              <p style={{ color: th.cor1, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 20, textAlign: "center" }}>
                {e.publico}
              </p>
            )}
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(2rem, 5.5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: 16, textAlign: "center", color: "#fff" }}>
              {e.headline || produto.nome}
            </h1>
            {e.subheadline && (
              <p style={{ textAlign: "center", color: th.text, fontSize: "clamp(1rem, 2.5vw, 1.15rem)", maxWidth: 620, margin: "0 auto 32px", lineHeight: 1.65, opacity: 0.85 }}>
                {e.subheadline}
              </p>
            )}
            <div style={{ width: 60, height: 3, background: `linear-gradient(90deg, ${th.cor1}, ${th.cor2})`, margin: "0 auto 36px", borderRadius: 2 }} />
            {imagens.length > 0 && (
              <div style={{ borderRadius: 8, overflow: "hidden", marginBottom: 40, border: `1px solid ${th.cor1}44` }}>
                <img src={driveImageUrl(imagens[0])} alt={produto.nome}
                  style={{ width: "100%", maxHeight: 520, objectFit: "cover", display: "block" }}
                  onError={ev => { (ev.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div style={{ textAlign: "center" }}>
              <a href={produto.salesLink} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", padding: "18px 52px", borderRadius: 4, background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 900, fontSize: "1rem", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {e.cta || "CONSULTAR AGORA"}
              </a>
            </div>
          </section>

          {e.proposta && (
            <section style={{ maxWidth: 820, margin: "0 auto 52px", padding: "0 20px" }}>
              <div style={{ padding: "28px 32px", borderLeft: `4px solid ${th.cor1}`, background: th.surface, borderRadius: "0 8px 8px 0" }}>
                <p style={{ color: th.cor2, fontSize: "1.1rem", fontStyle: "italic", lineHeight: 1.65, margin: 0, fontFamily: "Georgia, serif" }}>
                  &ldquo;{e.proposta}&rdquo;
                </p>
              </div>
            </section>
          )}

          {e.beneficios && e.beneficios.length > 0 && (
            <section style={{ maxWidth: 820, margin: "0 auto 52px", padding: "0 20px" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.3rem, 3vw, 2rem)", fontWeight: 700, textAlign: "center", marginBottom: 10, color: "#fff" }}>
                Áreas de Atuação
              </h2>
              <p style={{ textAlign: "center", color: th.muted, fontSize: 13, marginBottom: 36 }}>Expertise e diferenciais</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {e.beneficios.map((b, i) => (
                  <div key={i} style={{ padding: "24px 20px", border: `1px solid ${th.cor1}55`, background: th.surface, borderRadius: 8 }}>
                    <div style={{ color: th.cor1, fontSize: 24, marginBottom: 12 }}>
                      {["⚖️", "📋", "🏛️", "🤝", "🔒", "💼", "📌", "✅"][i % 8]}
                    </div>
                    <p style={{ color: th.text, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{b}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {videos.length > 0 && (
            <section style={{ maxWidth: 820, margin: "0 auto 52px", padding: "0 20px" }}>
              <p style={{ color: th.muted, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", textAlign: "center", marginBottom: 20 }}>Conheça melhor</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {videos.map((v, i) => (
                  <div key={i} style={{ maxWidth: v.shorts ? 315 : "100%", margin: v.shorts ? "0 auto" : undefined, width: "100%" }}>
                    <div style={{ position: "relative", paddingBottom: v.shorts ? "177.78%" : "56.25%", height: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${th.cor1}44`, background: "#000" }}>
                      <iframe src={videoEmbedUrl(v)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                        onLoad={() => { if (i === 0) setVideoAssistido(true); }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {e.dores && e.dores.length > 0 && (
            <section style={{ maxWidth: 820, margin: "0 auto 52px", padding: "0 20px" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.2rem, 3vw, 1.8rem)", fontWeight: 700, textAlign: "center", marginBottom: 32, color: "#fff" }}>
                Problemas que resolvemos
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {e.dores.map((d, i) => (
                  <div key={i} style={{ padding: "18px 22px", border: `1px solid ${th.cor1}33`, background: th.surface, borderRadius: 8, display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <span style={{ color: th.cor1, fontSize: 18, flexShrink: 0, marginTop: 2 }}>✓</span>
                    <p style={{ color: th.text, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{d}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(e.prova_social || e.transformacao) && (
            <section style={{ maxWidth: 820, margin: "0 auto 52px", padding: "0 20px" }}>
              <div style={{ padding: "40px 32px", textAlign: "center", border: `1px solid ${th.cor1}55`, background: `linear-gradient(160deg, ${th.cor1}0A, ${th.cor2}06)`, borderRadius: 8 }}>
                {e.transformacao && (
                  <p style={{ color: "#fff", fontSize: "1rem", fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1.7, marginBottom: e.prova_social ? 20 : 0 }}>
                    {e.transformacao}
                  </p>
                )}
                {e.prova_social && (
                  <p style={{ color: th.cor1, fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{e.prova_social}</p>
                )}
              </div>
            </section>
          )}

          {imagens.length > 1 && (
            <section style={{ maxWidth: 820, margin: "0 auto 52px", padding: "0 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {imagens.slice(1).map((link, i) => (
                  <div key={i} style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${th.cor1}33` }}>
                    <img src={driveImageUrl(link)} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
                      onError={ev => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section style={{ maxWidth: 820, margin: "0 auto 120px", padding: "0 20px", textAlign: "center" }}>
            <div style={{ padding: "56px 32px", borderRadius: 8, border: `1px solid ${th.cor1}66`, background: `linear-gradient(160deg, ${th.bg}, ${th.cor1}10)` }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.3rem, 3vw, 2rem)", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
                {produto.nome}
              </h2>
              <div style={{ width: 40, height: 2, background: th.cor1, margin: "0 auto 24px", borderRadius: 1 }} />
              <div style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 900, color: th.cor1, fontFamily: "Georgia, serif", marginBottom: 8 }}>
                {produto.preco}
              </div>
              <p style={{ color: th.muted, fontSize: 12, marginBottom: 32 }}>Consulta inicial · Atendimento personalizado</p>
              <a href={produto.salesLink} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-block", padding: "20px 64px", borderRadius: 4, background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 900, fontSize: "1.05rem", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {e.cta || "AGENDAR CONSULTA"}
              </a>
            </div>
          </section>
        </>
      )}

      {/* ── TEMPLATE PADRÃO ── */}
      {!isProf && (
        <>
      {/* ── HERO ── */}
      <section ref={heroRef} style={{ padding: "70px 20px 56px", maxWidth: 740, margin: "0 auto", textAlign: "center" }}>
        {th.emoji && <div style={{ fontSize: 48, marginBottom: 20 }}>{th.emoji}</div>}

        {e.publico && (
          <p className="fade-up" style={{ color: th.muted, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 16 }}>
            {e.publico}
          </p>
        )}

        <h1 className="fade-up" style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(1.9rem, 5.5vw, 3.4rem)",
          fontWeight: 900, lineHeight: 1.15, marginBottom: 20,
          background: `linear-gradient(160deg, #fff 0%, ${th.cor2} 50%, ${th.cor1} 100%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          {e.headline || produto.nome}
        </h1>

        {e.subheadline && (
          <p className="fade-up" style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)", color: th.text, maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.6, opacity: 0.85 }}>
            {e.subheadline}
          </p>
        )}

        {e.transformacao && (
          <div className="fade-up" style={{
            display: "inline-block", padding: "10px 24px", borderRadius: 50, marginBottom: 28,
            border: `1px solid ${th.border}`, background: th.surface,
            color: th.cor2, fontSize: 13, fontStyle: "italic", lineHeight: 1.5,
          }}>
            {e.transformacao}
          </div>
        )}

        {e.prova_social && (
          <p className="fade-up" style={{ color: th.cor1, fontSize: 13, fontWeight: 600, marginBottom: 32, letterSpacing: "0.02em" }}>
            ✦ {e.prova_social}
          </p>
        )}

        {/* Opções de produto (quando configuradas) */}
        {produto.modalidadeVenda === "pedido" && produto.opcoes && produto.opcoes.length > 0 ? (
          <div style={{ width: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {produto.opcoes.map((op, i) => (
              <div key={i} style={{ padding: "22px 24px", borderRadius: 20, border: `1px solid ${th.cor1}55`, background: `linear-gradient(135deg, ${th.cor1}08, ${th.cor2}05)`, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                  <div>
                    <p style={{ margin: "0 0 4px", color: "#fff", fontWeight: 800, fontSize: "1rem" }}>{op.nome}</p>
                    <p style={{ margin: 0, color: th.muted, fontSize: 12, lineHeight: 1.5 }}>{op.descricao}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, color: th.cor1, fontWeight: 900, fontSize: "1.3rem", fontFamily: "Georgia, serif" }}>{op.preco}</p>
                  </div>
                </div>
                <button onClick={() => abrirPedidoComOpcao(op)} style={{ width: "100%", padding: "13px", borderRadius: 50, background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 900, fontSize: "0.9rem", letterSpacing: "0.08em", textTransform: "uppercase", border: "none", cursor: "pointer", fontFamily: "inherit", boxShadow: `0 0 24px ${th.cor1}55` }}>
                  {e.cta || "SOLICITAR"} →
                </button>
              </div>
            ))}
            <p style={{ color: th.muted, fontSize: 11, textAlign: "center" }}>✓ Instalação em até 3 dias &nbsp;·&nbsp; ✓ Pagamento via PIX</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif" }}>{produto.preco}</div>
            {produto.modalidadeVenda === "pedido" ? (
              <button onClick={() => setPedidoModal(true)} style={{ padding: "18px 56px", borderRadius: 50, background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2}, ${th.cor1})`, color: "#060606", fontWeight: 900, fontSize: "1.05rem", letterSpacing: "0.1em", textTransform: "uppercase", boxShadow: `0 0 40px ${th.cor1}70, 0 8px 32px rgba(0,0,0,0.5)`, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                {e.cta || "SOLICITAR INSTALAÇÃO"}
              </button>
            ) : (
              <a href={produto.salesLink} target="_blank" rel="noopener noreferrer" style={{ padding: "18px 56px", borderRadius: 50, background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2}, ${th.cor1})`, color: "#060606", fontWeight: 900, fontSize: "1.05rem", textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase", boxShadow: `0 0 40px ${th.cor1}70, 0 8px 32px rgba(0,0,0,0.5)`, display: "block" }}>
                {e.cta || "QUERO AGORA"}
              </a>
            )}
            <p style={{ color: th.muted, fontSize: 11, marginTop: 4 }}>{produto.modalidadeVenda === "pedido" ? "✓ Instalação em até 3 dias · ✓ Pagamento via PIX" : "✓ Acesso imediato · ✓ Pagamento seguro"}</p>
          </div>
        )}
      </section>

      {/* ── VÍDEOS — acima das fotos ── */}
      {videos.length > 0 && (
        <section style={{ maxWidth: 740, margin: "0 auto 52px", padding: "0 20px" }}>
          <p style={{ color: th.muted, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", textAlign: "center", marginBottom: 20 }}>
            Assista antes de decidir
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {videos.map((v, i) => (
              <div key={i} style={{
                maxWidth: v.shorts ? 315 : "100%",
                margin: v.shorts ? "0 auto" : undefined,
                width: "100%",
              }}>
                <div style={{
                  position: "relative",
                  paddingBottom: v.shorts ? "177.78%" : "56.25%",
                  height: 0,
                  borderRadius: 18, overflow: "hidden",
                  border: `1px solid ${th.border}`,
                  background: "#000",
                }}>
                  <iframe
                    src={videoEmbedUrl(v)}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={() => { if (i === 0) setVideoAssistido(true); }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── IMAGES ── */}
      {imagens.length > 0 && (
        <section style={{ maxWidth: 740, margin: "0 auto 52px", padding: "0 20px" }}>
          <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${th.border}`, background: th.surface }}>
            <img
              src={driveImageUrl(imagens[imgAtiva])}
              alt={produto.nome}
              style={{ width: "100%", maxHeight: 440, objectFit: "cover", display: "block" }}
              onError={ev => { (ev.target as HTMLImageElement).style.display = "none"; }}
            />
            {imagens.length > 1 && (
              <div style={{ display: "flex", gap: 8, padding: "12px 14px", justifyContent: "center", flexWrap: "wrap" }}>
                {imagens.map((link, i) => (
                  <button key={i} onClick={() => setImgAtiva(i)} style={{
                    width: 54, height: 54, borderRadius: 8, overflow: "hidden",
                    border: `2px solid ${i === imgAtiva ? th.cor1 : "transparent"}`,
                    background: "none", cursor: "pointer", padding: 0,
                  }}>
                    <img src={driveImageUrl(link)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── BENEFITS ── */}
      {e.beneficios && e.beneficios.length > 0 && (
        <section style={{ maxWidth: 740, margin: "0 auto 52px", padding: "0 20px" }}>
          <h2 style={{
            fontFamily: "Georgia, serif", fontSize: "clamp(1.3rem, 3vw, 1.8rem)", fontWeight: 700,
            textAlign: "center", marginBottom: 32, lineHeight: 1.3,
            background: `linear-gradient(135deg, #fff, ${th.cor2})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            O que você vai conquistar
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            {e.beneficios.map((b, i) => (
              <div key={i} style={{
                padding: "20px 18px", borderRadius: 16,
                border: `1px solid ${th.border}`, background: th.surface,
                display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <span style={{ color: th.cor1, fontSize: 20, flexShrink: 0, marginTop: 2 }}>✦</span>
                <p style={{ color: th.text, fontSize: 14, lineHeight: 1.55, margin: 0 }}>{b}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DORES ── */}
      {e.dores && e.dores.length > 0 && (
        <section style={{ maxWidth: 740, margin: "0 auto 52px", padding: "0 20px" }}>
          <h2 style={{
            fontFamily: "Georgia, serif", fontSize: "clamp(1.2rem, 3vw, 1.7rem)", fontWeight: 700,
            textAlign: "center", marginBottom: 10, color: "#fff",
          }}>
            Você se reconhece nisso?
          </h2>
          <p style={{ color: th.muted, textAlign: "center", fontSize: 13, marginBottom: 28 }}>
            Esse produto foi feito exatamente pra quem sente isso.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {e.dores.map((d, i) => (
              <div key={i} style={{
                padding: "16px 20px", borderRadius: 14,
                border: `1px solid ${th.border}`, background: th.surface,
                display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <span style={{ color: th.cor1, fontSize: 16, flexShrink: 0, marginTop: 3 }}>→</span>
                <p style={{ color: th.text, fontSize: 14, lineHeight: 1.55, margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── URGÊNCIA ── */}
      {(e.urgencia || (e.gatilhos && e.gatilhos.length > 0)) && (
        <section style={{ maxWidth: 740, margin: "0 auto 52px", padding: "0 20px" }}>
          <div style={{
            padding: "32px 28px", borderRadius: 20,
            border: `1px solid ${th.cor1}55`,
            background: `linear-gradient(135deg, ${th.cor1}10, ${th.cor2}08)`,
            textAlign: "center",
          }}>
            {e.urgencia && (
              <p style={{ color: th.cor2, fontSize: "clamp(1rem, 2.5vw, 1.15rem)", fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
                {e.urgencia}
              </p>
            )}
            {e.gatilhos && e.gatilhos.map((g, i) => (
              <p key={i} style={{ color: th.muted, fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>✦ {g}</p>
            ))}
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <section style={{ maxWidth: 740, margin: "0 auto 120px", padding: "0 20px", textAlign: "center" }}>
        <div style={{ padding: "48px 24px", borderRadius: 24, border: `1px solid ${th.border}`, background: th.surface }}>
          <div style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: "#fff", fontFamily: "Georgia, serif", marginBottom: 8 }}>
            {produto.preco}
          </div>
          <p style={{ color: th.muted, fontSize: 12, marginBottom: 28 }}>
            {produto.modalidadeVenda === "pedido" ? "Instalação em até 3 dias · Pagamento via PIX" : "Pagamento único · Acesso imediato"}
          </p>
          {produto.modalidadeVenda === "pedido" && produto.opcoes && produto.opcoes.length > 0 ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {produto.opcoes.map((op, i) => (
                  <div key={i} style={{ padding: "18px 20px", borderRadius: 16, border: `1px solid ${th.cor1}44`, background: `${th.cor1}06`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ margin: "0 0 2px", color: "#fff", fontWeight: 700, fontSize: 14 }}>{op.nome}</p>
                      <p style={{ margin: 0, color: th.muted, fontSize: 11 }}>{op.descricao}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: "0 0 6px", color: th.cor1, fontWeight: 900, fontSize: "1.1rem", fontFamily: "Georgia, serif" }}>{op.preco}</p>
                      <button onClick={() => abrirPedidoComOpcao(op)} style={{ padding: "8px 18px", borderRadius: 20, background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>Solicitar →</button>
                    </div>
                  </div>
                ))}
              </div>
              {(produto.whatsappContato || afiliadoWpp) && (
                <div style={{ marginTop: 20 }}>
                  <a
                    href={`https://wa.me/${afiliadoWpp || produto.whatsappContato}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "14px 32px", borderRadius: 50,
                      border: "1px solid rgba(37,211,102,0.4)",
                      background: "rgba(37,211,102,0.08)",
                      color: "#25D366", fontWeight: 700, fontSize: "0.9rem",
                      textDecoration: "none", letterSpacing: "0.06em",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Falar com {afiliadoWpp ? "o Revendedor" : "a Empresa"}
                  </a>
                </div>
              )}
            </>
          ) : (
            <a
              href={produto.salesLink} target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-block", padding: "20px 60px", borderRadius: 50,
                background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2}, ${th.cor1})`,
                color: "#060606", fontWeight: 900, fontSize: "1.05rem",
                textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase",
                boxShadow: `0 0 50px ${th.cor1}80, 0 8px 32px rgba(0,0,0,0.5)`,
              }}
            >
              {e.cta || "GARANTIR MINHA VAGA"}
            </a>
          )}
        </div>
      </section>
        </>
      )}

      {/* ── OVERLAY DE INÍCIO ── */}
      {!audioAtivado && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: `linear-gradient(160deg, ${th.bg}EE 0%, rgba(0,0,0,0.97) 100%)`,
          backdropFilter: "blur(6px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 20, padding: 32, textAlign: "center",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${th.cor2}, ${th.cor1} 60%, #1a0e00)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36,
            boxShadow: `0 0 40px ${th.cor1}88`,
            animation: "pulse 2.5s ease-in-out infinite, glow 2.5s ease-in-out infinite",
          }}>
            🔮
          </div>

          <div>
            <h2 style={{
              fontFamily: "Georgia, serif", fontSize: "1.5rem", fontWeight: 900,
              background: `linear-gradient(135deg, #fff, ${th.cor2})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              margin: "0 0 8px",
            }}>
              Kadosh está aqui
            </h2>
            <p style={{ color: th.muted, fontSize: 14, margin: 0, lineHeight: 1.6, maxWidth: 300 }}>
              Toque para iniciar a conversa. Ele se apresenta e você pode perguntar qualquer coisa sobre o produto.
            </p>
          </div>

          <button
            onClick={ativarKadosh}
            style={{
              padding: "18px 48px", borderRadius: 50,
              background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2}, ${th.cor1})`,
              color: "#060606", fontWeight: 900, fontSize: "1.05rem",
              border: "none", cursor: "pointer", letterSpacing: "0.08em",
              boxShadow: `0 0 40px ${th.cor1}80, 0 8px 32px rgba(0,0,0,0.5)`,
              fontFamily: "inherit",
            }}
          >
            🎙️ Iniciar conversa
          </button>

          <p style={{ color: th.muted, fontSize: 11, opacity: 0.6 }}>
            Conversa por voz · em tempo real
          </p>
        </div>
      )}

      {/* ── CHAT EXPANDIDO ── */}
      {chatAberto && audioAtivado && (
        <div style={{
          position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 99,
          maxHeight: "45vh", display: "flex", flexDirection: "column",
          background: "rgba(8,12,24,0.98)", backdropFilter: "blur(24px)",
          borderTop: `1px solid ${th.cor1}40`,
          boxShadow: `0 -12px 48px rgba(0,0,0,0.7)`,
          animation: "slidein 0.3s ease",
        }}>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
            {mensagens.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "10px 14px",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" ? `${th.cor1}22` : "rgba(255,255,255,0.05)",
                  border: `1px solid ${m.role === "user" ? th.cor1 + "44" : th.border}`,
                  color: m.role === "user" ? "#fff" : th.text,
                  fontSize: 14, lineHeight: 1.55,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {pensando && (
              <div style={{ display: "flex", gap: 5, paddingLeft: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="dot-blink" style={{ width: 7, height: 7, borderRadius: "50%", background: th.cor1, opacity: 0.7, animationDelay: `${i * 0.22}s` }} />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* ── BARRA DE STATUS (quando ativo) ── */}
      {audioAtivado && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
          height: 64,
          background: "rgba(8,12,24,0.97)",
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${th.cor1}44`,
          display: "flex", alignItems: "center",
          padding: "0 16px", gap: 12,
        }}>
          {/* Orb pequeno com status */}
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: `radial-gradient(circle at 35% 35%, ${th.cor2}, ${th.cor1} 60%, #2a1800)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            boxShadow: jowState === "speaking" ? `0 0 20px ${th.cor1}BB` : "none",
            transition: "box-shadow 0.3s",
          }}>
            🔮
          </div>

          {/* Status texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: th.cor2, fontSize: 13, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Kadosh</p>
            <p style={{
              margin: 0, fontSize: 11,
              color: pensando ? th.muted : jowState === "speaking" ? th.cor1 : gravando ? "#4CAF50" : th.muted,
            }}>
              {pensando ? "pensando…" : jowState === "speaking" ? "🔊 falando…" : gravando ? "🎤 te ouvindo…" : "aguardando…"}
            </p>
          </div>

          {/* Botão falar manual (só aparece quando idle) */}
          {!gravando && !pensando && jowState !== "speaking" && (
            <button
              onClick={() => iniciarOuvindoAuto()}
              style={{
                flexShrink: 0, padding: "8px 14px", borderRadius: 20,
                border: `1px solid ${th.cor1}66`, background: th.surface,
                color: th.cor1, fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}
            >
              🎤 falar
            </button>
          )}

          {/* Botão chat */}
          <button
            onClick={() => setChatAberto(v => !v)}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 20,
              border: `1px solid ${chatAberto ? th.cor1 + "88" : th.border}`,
              background: chatAberto ? th.cor1 + "22" : th.surface,
              color: chatAberto ? th.cor1 : th.muted,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            {chatAberto ? "fechar ↓" : "chat ↑"}
          </button>

          {/* Botão encerrar */}
          <button
            onClick={encerrarConversa}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 20,
              border: "1px solid rgba(255,80,60,0.35)",
              background: "rgba(255,60,40,0.08)",
              color: "#FF6050", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}
          >
            encerrar
          </button>
        </div>
      )}

      {/* ── BANNER REVENDEDOR (quando acessado via link de afiliado) ── */}
      {afiliadoWpp && (
        <div style={{
          position: "fixed", bottom: audioAtivado ? 64 : 0, left: 0, right: 0, zIndex: 70,
          background: "rgba(8,20,8,0.97)", backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(76,175,80,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "10px 16px", gap: 12,
        }}>
          <p style={{ color: "#90EAB0", fontSize: 12, margin: 0 }}>
            💬 Fale com seu revendedor no WhatsApp para fechar a compra
          </p>
          <a
            href={`https://wa.me/${afiliadoWpp}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              flexShrink: 0, padding: "8px 18px", borderRadius: 20,
              background: "linear-gradient(135deg, #25D366, #128C7E)",
              color: "#fff", fontWeight: 800, fontSize: 12,
              textDecoration: "none", whiteSpace: "nowrap",
            }}
          >
            📱 WhatsApp
          </a>
        </div>
      )}

      {/* ── BOTÃO REVENDA (fixo no canto) — só aparece quando habilitado no produto ── */}
      {!afiliadoWpp && produto?.permitirAfiliados && (
        <button
          onClick={() => setRevendaModal(true)}
          style={{
            position: "fixed", bottom: audioAtivado ? 72 : 16, right: 16, zIndex: 70,
            padding: "10px 18px", borderRadius: 24,
            background: "rgba(8,12,24,0.95)", backdropFilter: "blur(12px)",
            border: `1px solid ${th.cor1}44`,
            color: th.muted, fontSize: 11, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          🤝 Revenda e ganhe
        </button>
      )}

      {/* ── MODAL WHATSAPP ── */}
      {whatsappModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
        }}>
          <div style={{ background: "#0C1020", border: `1px solid ${th.cor1}40`, borderRadius: 22, padding: 36, maxWidth: 380, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 18 }}>💬</div>
            <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.25rem", marginBottom: 12 }}>
              Posso te mandar mais detalhes?
            </h3>
            <p style={{ color: th.muted, fontSize: 13, marginBottom: 26, lineHeight: 1.6 }}>
              Me passa seu WhatsApp e eu te envio tudo que você precisa saber pra tomar a melhor decisão.
            </p>
            <input
              value={whatsappNum}
              onChange={ev => setWhatsappNum(ev.target.value)}
              placeholder="(00) 90000-0000"
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12,
                border: `1px solid ${th.border}`, background: "rgba(255,255,255,0.04)",
                color: "#fff", fontSize: 15, outline: "none",
                marginBottom: 16, textAlign: "center",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setWhatsappModal(false)} style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${th.border}`, background: "none", color: th.muted, cursor: "pointer", fontSize: 13 }}>
                Agora não
              </button>
              <button onClick={salvarWhatsapp} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>
                Quero receber
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL PEDIDO DE INSTALAÇÃO ── */}
      {pedidoModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
          <div style={{ background: "#0C1020", border: `1px solid ${th.cor1}40`, borderRadius: 22, padding: 32, maxWidth: 420, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>

            {/* Step 1 — Formulário */}
            {pedidoStep === "form" && (
              <>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                  <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.2rem", margin: "0 0 8px" }}>Solicitar Instalação</h3>
                  {opcaoSelecionada && (
                    <div style={{ background: `${th.cor1}15`, border: `1px solid ${th.cor1}44`, borderRadius: 10, padding: "8px 14px", marginBottom: 12 }}>
                      <p style={{ margin: 0, color: th.cor1, fontWeight: 700, fontSize: 13 }}>{opcaoSelecionada.nome} — {opcaoSelecionada.preco}</p>
                    </div>
                  )}
                  <p style={{ color: th.muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>Preencha seus dados para agendar em até <strong style={{ color: th.cor2 }}>3 dias úteis</strong>.</p>
                </div>
                {[
                  { label: "Nome completo *", value: pedidoNome, set: setPedidoNome, placeholder: "Seu nome" },
                  { label: "Telefone para contato *", value: pedidoTel, set: setPedidoTel, placeholder: "(00) 90000-0000" },
                  { label: "Endereço completo *", value: pedidoEnd, set: setPedidoEnd, placeholder: "Rua, número, bairro, cidade" },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: 14 }}>
                    <p style={{ color: th.muted, fontSize: 11, marginBottom: 6, margin: "0 0 6px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{f.label}</p>
                    <input value={f.value} onChange={ev => f.set(ev.target.value)} placeholder={f.placeholder} style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1px solid ${th.border}`, background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 15, outline: "none", fontFamily: "inherit" }} />
                  </div>
                ))}
                <div style={{ background: `${th.cor1}12`, border: `1px solid ${th.cor1}44`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, marginTop: 8 }}>
                  <p style={{ color: th.cor2, fontSize: 12, margin: 0, lineHeight: 1.6 }}>🚚 Prazo de instalação: <strong>até 3 dias úteis</strong> após confirmação do pagamento.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={fecharPedidoModal} style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${th.border}`, background: "none", color: th.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>Cancelar</button>
                  <button onClick={enviarPedido} disabled={pedidoEnviando || !pedidoNome.trim() || !pedidoTel.trim() || !pedidoEnd.trim()} style={{ flex: 2, padding: "13px", borderRadius: 12, border: "none", background: pedidoEnviando ? th.muted : `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 800, cursor: pedidoEnviando ? "not-allowed" : "pointer", fontSize: 13, fontFamily: "inherit" }}>
                    {pedidoEnviando ? "Enviando…" : "Continuar →"}
                  </button>
                </div>
              </>
            )}

            {/* Step 2 — PIX */}
            {pedidoStep === "pix" && pedidoPix && (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>💳</div>
                  <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.2rem", margin: "0 0 8px" }}>Realize o pagamento</h3>
                  <p style={{ color: th.muted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>Copie a chave PIX abaixo e faça o pagamento no seu banco.</p>
                </div>
                <div style={{ background: `${th.cor1}10`, border: `1px solid ${th.cor1}44`, borderRadius: 14, padding: "20px", marginBottom: 16, textAlign: "center" }}>
                  <p style={{ color: th.muted, fontSize: 11, margin: "0 0 6px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Valor a pagar</p>
                  <p style={{ color: "#fff", fontSize: "1.6rem", fontWeight: 900, fontFamily: "Georgia, serif", margin: "0 0 16px" }}>{pedidoPix.valor}</p>
                  {pedidoPix.pixKey ? (
                    <>
                      <p style={{ color: th.muted, fontSize: 11, margin: "0 0 6px", letterSpacing: "0.1em", textTransform: "uppercase" }}>Chave PIX</p>
                      <p style={{ color: th.cor2, fontSize: 15, fontWeight: 700, wordBreak: "break-all", margin: "0 0 12px" }}>{pedidoPix.pixKey}</p>
                      <button onClick={() => { navigator.clipboard.writeText(pedidoPix.pixKey); setPixCopiado(true); setTimeout(() => setPixCopiado(false), 2500); }} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${th.border}`, background: pixCopiado ? `${th.cor1}22` : "none", color: pixCopiado ? th.cor1 : th.muted, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
                        {pixCopiado ? "✓ Chave copiada!" : "Copiar chave PIX"}
                      </button>
                    </>
                  ) : (
                    <p style={{ color: th.muted, fontSize: 13, margin: 0 }}>Entre em contato via WhatsApp para receber a chave PIX.</p>
                  )}
                </div>
                <div style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 20 }}>
                  <p style={{ color: "#90EAB0", fontSize: 12, margin: 0, lineHeight: 1.6 }}>✅ Após o pagamento, sua instalação será agendada em até <strong>3 dias úteis</strong>. Você será avisado pelo WhatsApp.</p>
                </div>
                <button onClick={() => setPedidoStep("ok")} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 800, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                  ✓ Já fiz o pagamento
                </button>
              </>
            )}

            {/* Step 3 — Confirmação */}
            {pedidoStep === "ok" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.2rem", margin: "0 0 12px" }}>Pedido registrado!</h3>
                <p style={{ color: th.muted, fontSize: 13, lineHeight: 1.7, margin: "0 0 24px" }}>
                  Assim que confirmarmos seu pagamento, entraremos em contato para agendar a instalação em até <strong style={{ color: th.cor2 }}>3 dias úteis</strong>.
                </p>
                <button onClick={fecharPedidoModal} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 800, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL REVENDA ── */}
      {revendaModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20,
        }}>
          <div style={{ background: "#0C1020", border: `1px solid ${th.cor1}40`, borderRadius: 22, padding: 36, maxWidth: 400, width: "100%", textAlign: "center" }}>
            {!revendaLink ? (
              <>
                <div style={{ fontSize: 44, marginBottom: 16 }}>🤝</div>
                <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.25rem", marginBottom: 8, margin: "0 0 8px" }}>
                  Revenda e ganhe R$ 30
                </h3>
                <p style={{ color: th.muted, fontSize: 13, marginBottom: 24, margin: "0 0 24px", lineHeight: 1.6 }}>
                  Cadastre-se como revendedor de <strong style={{ color: th.cor2 }}>{produto?.nome}</strong> e ganhe <strong style={{ color: th.cor1 }}>R$ 30,00</strong> por cada venda confirmada.
                </p>
                <input
                  value={revendaNome}
                  onChange={e => setRevendaNome(e.target.value)}
                  placeholder="Seu nome"
                  style={{
                    width: "100%", padding: "13px 16px", borderRadius: 12,
                    border: `1px solid ${th.border}`, background: "rgba(255,255,255,0.04)",
                    color: "#fff", fontSize: 15, outline: "none",
                    marginBottom: 12, textAlign: "center", fontFamily: "inherit",
                  }}
                />
                <input
                  value={revendaWpp}
                  onChange={e => setRevendaWpp(e.target.value)}
                  placeholder="Seu WhatsApp (DDD + número)"
                  style={{
                    width: "100%", padding: "13px 16px", borderRadius: 12,
                    border: `1px solid ${th.border}`, background: "rgba(255,255,255,0.04)",
                    color: "#fff", fontSize: 15, outline: "none",
                    marginBottom: 20, textAlign: "center", fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setRevendaModal(false); setRevendaNome(""); setRevendaWpp(""); }} style={{ flex: 1, padding: "13px", borderRadius: 12, border: `1px solid ${th.border}`, background: "none", color: th.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                    Agora não
                  </button>
                  <button
                    onClick={cadastrarAfiliado}
                    disabled={revendando || !revendaNome.trim() || !revendaWpp.trim()}
                    style={{
                      flex: 2, padding: "13px", borderRadius: 12, border: "none",
                      background: revendando ? th.muted : `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`,
                      color: "#060606", fontWeight: 800, cursor: revendando ? "not-allowed" : "pointer",
                      fontSize: 13, fontFamily: "inherit",
                    }}
                  >
                    {revendando ? "Cadastrando…" : "Quero revender!"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.25rem", marginBottom: 8, margin: "0 0 8px" }}>
                  Cadastro confirmado!
                </h3>
                <p style={{ color: th.muted, fontSize: 13, marginBottom: 20, margin: "0 0 20px", lineHeight: 1.6 }}>
                  Seu dashboard de revendedor está pronto. Acesse o link abaixo para ver seus relatórios e gerar cobranças.
                </p>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: `1px solid ${th.border}`, fontSize: 12, color: th.text, wordBreak: "break-all", marginBottom: 16 }}>
                  {revendaLink}
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(revendaLink); }}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, border: `1px solid ${th.border}`, background: "none", color: th.cor1, cursor: "pointer", fontSize: 13, fontWeight: 700, marginBottom: 10, fontFamily: "inherit" }}
                >
                  Copiar link do dashboard
                </button>
                <button
                  onClick={() => { window.open(revendaLink, "_blank"); }}
                  style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2})`, color: "#060606", fontWeight: 800, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
                >
                  Acessar meu dashboard →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
