"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useJow, unlockJowAudio, stopJowAudio } from "@/hooks/useJow";
import { useJowStore } from "@/stores/jowStore";


type VideoInfo = { type: "youtube" | "drive"; id: string; shorts: boolean };

function extractVideoInfo(url: string): VideoInfo | null {
  if (!url?.trim()) return null;
  // YouTube Shorts
  const shorts = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shorts) return { type: "youtube", id: shorts[1], shorts: true };
  // YouTube normal
  const yt = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type: "youtube", id: yt[1], shorts: false };
  // Google Drive
  const drive = url.match(/\/d\/([\w-]+)/);
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

interface Produto {
  nome: string;
  preco: string;
  imageLinks: string[];
  videoLinks: string[];
  salesLink: string;
  estrutura: Estrutura;
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
      || `Oi, eu sou o Kadosh — estou aqui pra te apresentar o ${nomeP} e conversar com você sobre ele. Pode me fazer qualquer pergunta sobre o produto, tirar dúvidas, e se quiser, a gente pode conversar sobre como adquirir também. É só falar comigo normalmente, como se eu fosse uma pessoa real. Pode começar!`;
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

  // Para tudo e volta para o estado inicial
  function encerrarConversa() {
    mediaRef.current?.stop();
    gravandoRef.current = false;
    pensandoRef.current = false;
    ouvirAposVoz.current = false;
    setGravando(false);
    setPensando(false);
    setChatAberto(false);
    stopJowAudio();
    setAudioAtivado(false);
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

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: "clamp(2rem, 5vw, 2.8rem)", fontWeight: 800, color: "#fff", fontFamily: "Georgia, serif" }}>
            {produto.preco}
          </div>
          <a
            href={produto.salesLink} target="_blank" rel="noopener noreferrer"
            style={{
              padding: "18px 56px", borderRadius: 50,
              background: `linear-gradient(135deg, ${th.cor1}, ${th.cor2}, ${th.cor1})`,
              color: "#060606", fontWeight: 900, fontSize: "1.05rem",
              textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase",
              boxShadow: `0 0 40px ${th.cor1}70, 0 8px 32px rgba(0,0,0,0.5)`,
              display: "block", transition: "transform 0.15s",
            }}
          >
            {e.cta || "QUERO AGORA"}
          </a>
          <p style={{ color: th.muted, fontSize: 11, marginTop: 4 }}>✓ Acesso imediato &nbsp;·&nbsp; ✓ Pagamento seguro</p>
        </div>
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
                borderRadius: 18, overflow: "hidden", border: `1px solid ${th.border}`,
                position: "relative",
                maxWidth: v.shorts ? 380 : "100%",
                margin: v.shorts ? "0 auto" : undefined,
                paddingBottom: v.shorts ? "177.78%" : "56.25%",
                height: 0,
              }}>
                <iframe
                  src={videoEmbedUrl(v)}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onLoad={() => { if (i === 0) setVideoAssistido(true); }}
                />
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
          <p style={{ color: th.muted, fontSize: 12, marginBottom: 28 }}>Pagamento único · Acesso imediato</p>
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
        </div>
      </section>

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
    </main>
  );
}
