"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useJow, unlockJowAudio } from "@/hooks/useJow";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const MUTED_COLOR = "#7A6018";
const BORDER = "rgba(212,160,23,0.18)";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function driveImageUrl(link: string): string {
  const match = link.match(/\/d\/([\w-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : link;
}

interface Produto {
  nome: string;
  preco: string;
  imageLinks: string[];
  videoUrl: string | null;
  salesLink: string;
  estrutura: {
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
  };
}

export default function PaginaVendas({ params }: { params: { slug: string } }) {
  const { speak, transcribe } = useJow();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [ativado, setAtivado] = useState(false);
  const [imgAtiva, setImgAtiva] = useState(0);
  const [videoAssistido, setVideoAssistido] = useState(false);
  const [videoTocando, setVideoTocando] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Array<{ role: string; content: string }>>([]);
  const [gravando, setGravando] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [whatsappNum, setWhatsappNum] = useState("");
  const ytPlayerRef = useRef<any>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const kadoshSilenciadoRef = useRef(false);

  // Load product
  useEffect(() => {
    fetch(`/api/vendedor/produto/${params.slug}`)
      .then(r => r.json())
      .then(d => { setProduto(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.slug]);

  // YouTube IFrame API
  useEffect(() => {
    if (!produto?.videoUrl) return;
    const videoId = extractYouTubeId(produto.videoUrl);
    if (!videoId) return;

    const createPlayer = (id: string) => {
      if (!ytContainerRef.current) return;
      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId: id,
        playerVars: { autoplay: 1, mute: 1, loop: 1, playlist: id, controls: 1, rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (ev: any) => {
            if (ev.data === 1) {
              setVideoTocando(true);
              const isMuted = ytPlayerRef.current?.isMuted?.();
              kadoshSilenciadoRef.current = !isMuted;
            }
            if (ev.data === 2 || ev.data === 0) {
              setVideoTocando(false);
              kadoshSilenciadoRef.current = false;
              if (ev.data === 0) setVideoAssistido(true);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer(videoId);
    } else {
      window.onYouTubeIframeAPIReady = () => createPlayer(videoId);
      if (!document.getElementById("yt-api")) {
        const s = document.createElement("script");
        s.id = "yt-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }
  }, [produto?.videoUrl]);

  // Poll mute state when video is playing
  useEffect(() => {
    if (!videoTocando) return;
    const interval = setInterval(() => {
      if (!ytPlayerRef.current) return;
      const isMuted = ytPlayerRef.current.isMuted?.();
      kadoshSilenciadoRef.current = !isMuted;
    }, 500);
    return () => clearInterval(interval);
  }, [videoTocando]);

  const speakSafe = useCallback(async (text: string) => {
    if (kadoshSilenciadoRef.current) return;
    await speak(text);
  }, [speak]);

  async function ativar() {
    unlockJowAudio();
    setAtivado(true);
    setChatAberto(true);
    const abertura = produto?.estrutura?.abertura
      || `Olá! Seja bem-vindo. Estou aqui para te apresentar ${produto?.nome}. Como posso te ajudar?`;
    await speakSafe(abertura);
    setMensagens([{ role: "assistant", content: abertura }]);
  }

  async function enviarMensagem(texto: string) {
    if (!texto.trim() || pensando) return;
    const novas = [...mensagens, { role: "user", content: texto }];
    setMensagens(novas);
    setPensando(true);

    try {
      const res = await fetch("/api/vendedor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: params.slug, mensagens: novas, videoAssistido }),
      });
      const data = await res.json();
      const resposta = data.resposta || "Pode repetir?";
      const acao = data.acao;

      setMensagens(prev => [...prev, { role: "assistant", content: resposta }]);
      await speakSafe(resposta);

      if (acao === "REPRODUZIR_VIDEO" && ytPlayerRef.current) {
        ytPlayerRef.current.unMute?.();
        ytPlayerRef.current.playVideo?.();
      }
      if (acao === "PEDIR_WHATSAPP") {
        setTimeout(() => setWhatsappModal(true), 1500);
      }
      if (acao === "IR_PARA_COMPRA" && produto?.salesLink) {
        setTimeout(() => window.open(produto.salesLink, "_blank"), 1000);
      }
    } catch {
      const err = "Desculpe, tive um problema. Pode repetir?";
      setMensagens(prev => [...prev, { role: "assistant", content: err }]);
    } finally {
      setPensando(false);
    }
  }

  async function iniciarGravacao() {
    if (gravando || pensando) return;
    setGravando(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const texto = await transcribe(blob);
      setGravando(false);
      if (texto.trim()) await enviarMensagem(texto);
    };
    rec.start();
    mediaRef.current = rec;
  }

  function pararGravacao() {
    mediaRef.current?.stop();
  }

  async function salvarWhatsapp() {
    if (!whatsappNum.trim()) return;
    setWhatsappModal(false);
    await speakSafe("Ótimo! Vou te enviar mais informações pelo WhatsApp. Qualquer dúvida, é só me chamar!");
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: GOLD, animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  if (!produto) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: MUTED_COLOR }}>Página não encontrada</p>
    </main>
  );

  const imagens = produto.imageLinks.filter(Boolean);
  const videoId = produto.videoUrl ? extractYouTubeId(produto.videoUrl) : null;
  const e = produto.estrutura;

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.12); opacity: 0.85 } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(212,160,23,0.4) } 50% { box-shadow: 0 0 40px rgba(212,160,23,0.8) } }
        .chat-msg { animation: fadeIn 0.3s ease; }
        .orb-pulse { animation: pulse 2.5s ease-in-out infinite; }
        .orb-glow { animation: glow 2s ease-in-out infinite; }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ padding: "60px 20px 40px", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        {e.publico && (
          <p style={{ color: MUTED_COLOR, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 16 }}>
            {e.publico}
          </p>
        )}
        <h1 style={{
          fontFamily: "Georgia, serif", fontSize: "clamp(1.8rem, 5vw, 3rem)",
          background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          marginBottom: 20, lineHeight: 1.2,
        }}>
          {produto.nome}
        </h1>
        {e.proposta && (
          <p style={{ color: "#C8B070", fontSize: "clamp(1rem, 2.5vw, 1.25rem)", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.5 }}>
            {e.proposta}
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700, color: GOLD_LIGHT, fontFamily: "Georgia, serif" }}>
            {produto.preco}
          </div>
          <a
            href={produto.salesLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", padding: "18px 48px", borderRadius: 50,
              background: `linear-gradient(135deg, #A07010, ${GOLD})`,
              color: "#0A0808", fontWeight: 700, fontSize: "1.05rem",
              textDecoration: "none", letterSpacing: "0.1em",
              boxShadow: `0 0 40px rgba(212,160,23,0.5)`,
            }}
          >
            {e.cta || "QUERO COMPRAR AGORA"}
          </a>
        </div>
      </section>

      {/* ── IMAGES GALLERY ── */}
      {imagens.length > 0 && (
        <section style={{ maxWidth: 760, margin: "0 auto 48px", padding: "0 20px" }}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${BORDER}`, background: "rgba(212,160,23,0.04)" }}>
            <img
              src={driveImageUrl(imagens[imgAtiva])}
              alt={produto.nome}
              style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block" }}
              onError={ev => { (ev.target as HTMLImageElement).style.display = "none"; }}
            />
            {imagens.length > 1 && (
              <div style={{ display: "flex", gap: 8, padding: 12, justifyContent: "center" }}>
                {imagens.map((link, i) => (
                  <button
                    key={i}
                    onClick={() => setImgAtiva(i)}
                    style={{
                      width: 56, height: 56, borderRadius: 8, overflow: "hidden",
                      border: `2px solid ${i === imgAtiva ? GOLD : "transparent"}`,
                      background: "none", cursor: "pointer", padding: 0, flexShrink: 0,
                    }}
                  >
                    <img src={driveImageUrl(link)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── VIDEO ── */}
      {videoId && (
        <section style={{ maxWidth: 760, margin: "0 auto 48px", padding: "0 20px" }}>
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${BORDER}`, position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <div ref={ytContainerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          </div>
          <p style={{ color: MUTED_COLOR, fontSize: 11, textAlign: "center", marginTop: 8 }}>
            Assista com som para uma experiência completa
          </p>
        </section>
      )}

      {/* ── BENEFITS ── */}
      {e.beneficios && e.beneficios.length > 0 && (
        <section style={{ maxWidth: 760, margin: "0 auto 48px", padding: "0 20px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", color: GOLD, fontSize: "1.3rem", letterSpacing: "0.1em", textAlign: "center", marginBottom: 24 }}>
            O QUE VOCÊ VAI CONQUISTAR
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {e.beneficios.map((b, i) => (
              <div key={i} style={{ padding: "20px 18px", borderRadius: 14, border: `1px solid ${BORDER}`, background: "rgba(212,160,23,0.04)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: GOLD, fontSize: 18, flexShrink: 0, marginTop: 2 }}>✦</span>
                <p style={{ color: "#C8B070", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{b}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DORES ── */}
      {e.dores && e.dores.length > 0 && (
        <section style={{ maxWidth: 760, margin: "0 auto 48px", padding: "0 20px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", color: GOLD, fontSize: "1.3rem", letterSpacing: "0.1em", textAlign: "center", marginBottom: 24 }}>
            ESSE PRODUTO É PARA VOCÊ SE...
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {e.dores.map((d, i) => (
              <div key={i} style={{ padding: "16px 18px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "rgba(212,160,23,0.03)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "#e74c3c", fontSize: 14, flexShrink: 0, marginTop: 2 }}>→</span>
                <p style={{ color: "#A89060", fontSize: 14, lineHeight: 1.5, margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SECOND CTA ── */}
      <section style={{ maxWidth: 760, margin: "0 auto 100px", padding: "0 20px", textAlign: "center" }}>
        <div style={{ padding: "40px 24px", borderRadius: 20, border: `1px solid ${BORDER}`, background: "rgba(212,160,23,0.06)" }}>
          {e.gatilhos && e.gatilhos.length > 0 && (
            <p style={{ color: MUTED_COLOR, fontSize: 13, marginBottom: 16 }}>{e.gatilhos[0]}</p>
          )}
          <div style={{ fontSize: "clamp(1.4rem, 3.5vw, 2rem)", fontWeight: 700, color: GOLD_LIGHT, fontFamily: "Georgia, serif", marginBottom: 20 }}>
            {produto.preco}
          </div>
          <a
            href={produto.salesLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", padding: "18px 52px", borderRadius: 50,
              background: `linear-gradient(135deg, #A07010, ${GOLD})`,
              color: "#0A0808", fontWeight: 700, fontSize: "1rem",
              textDecoration: "none", letterSpacing: "0.12em",
              boxShadow: `0 0 40px rgba(212,160,23,0.5)`,
            }}
          >
            {e.cta || "GARANTIR MINHA VAGA"}
          </a>
        </div>
      </section>

      {/* ── KADOSH ORB ── */}
      {!ativado ? (
        <button
          onClick={ativar}
          className="orb-pulse orb-glow"
          style={{
            position: "fixed", bottom: 28, right: 28,
            width: 68, height: 68, borderRadius: "50%",
            border: `2px solid ${GOLD}`,
            background: `radial-gradient(circle at 35% 35%, #A07010, #070B18)`,
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 2,
            zIndex: 100,
          }}
          title="Falar com Kadosh"
        >
          <span style={{ fontSize: 22 }}>🔮</span>
          <span style={{ color: GOLD, fontSize: 8, letterSpacing: "0.1em", fontWeight: 700 }}>KADOSH</span>
        </button>
      ) : (
        <>
          {chatAberto && (
            <div style={{
              position: "fixed", bottom: 110, right: 20,
              width: "min(360px, calc(100vw - 40px))",
              maxHeight: "50vh", display: "flex", flexDirection: "column",
              borderRadius: 20, border: `1px solid ${BORDER}`,
              background: "rgba(7,11,24,0.97)", backdropFilter: "blur(20px)",
              zIndex: 99, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>🔮</span>
                  <div>
                    <p style={{ color: GOLD, fontSize: 13, fontWeight: 700, margin: 0 }}>Kadosh</p>
                    <p style={{ color: MUTED_COLOR, fontSize: 10, margin: 0 }}>Especialista em vendas</p>
                  </div>
                </div>
                <button onClick={() => setChatAberto(false)} style={{ background: "none", border: "none", color: MUTED_COLOR, cursor: "pointer", fontSize: 18 }}>×</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
                {mensagens.map((m, i) => (
                  <div key={i} className="chat-msg" style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "85%", padding: "10px 14px",
                      borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: m.role === "user" ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${m.role === "user" ? "rgba(212,160,23,0.3)" : BORDER}`,
                      color: m.role === "user" ? GOLD_LIGHT : "#C8B070",
                      fontSize: 13, lineHeight: 1.5,
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {pensando && (
                  <div style={{ display: "flex", gap: 6, padding: "8px 0" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD, opacity: 0.6, animation: `pulse ${0.8 + i * 0.2}s ease-in-out infinite` }} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}` }}>
                <button
                  onMouseDown={iniciarGravacao}
                  onMouseUp={pararGravacao}
                  onTouchStart={iniciarGravacao}
                  onTouchEnd={pararGravacao}
                  disabled={pensando}
                  style={{
                    width: "100%", padding: "12px", borderRadius: 12,
                    border: `1px solid ${gravando ? "#e74c3c" : BORDER}`,
                    background: gravando ? "rgba(231,76,60,0.15)" : "rgba(212,160,23,0.08)",
                    color: gravando ? "#e74c3c" : GOLD,
                    cursor: pensando ? "default" : "pointer",
                    fontSize: 13, fontWeight: 600, letterSpacing: "0.05em",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  <span>{gravando ? "🔴" : "🎤"}</span>
                  {gravando ? "Ouvindo... solte para enviar" : "Segurar para falar"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setChatAberto(prev => !prev)}
            className={chatAberto ? "orb-glow" : "orb-pulse orb-glow"}
            style={{
              position: "fixed", bottom: 28, right: 28,
              width: 68, height: 68, borderRadius: "50%",
              border: `2px solid ${GOLD}`,
              background: `radial-gradient(circle at 35% 35%, #A07010, #070B18)`,
              cursor: "pointer", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              zIndex: 100,
            }}
          >
            <span style={{ fontSize: 22 }}>🔮</span>
            <span style={{ color: GOLD, fontSize: 8, letterSpacing: "0.1em", fontWeight: 700 }}>KADOSH</span>
          </button>
        </>
      )}

      {/* ── WHATSAPP MODAL ── */}
      {whatsappModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
        }}>
          <div style={{ background: "#0D1020", border: `1px solid ${BORDER}`, borderRadius: 20, padding: 32, maxWidth: 380, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💬</div>
            <h3 style={{ color: GOLD_LIGHT, fontFamily: "Georgia, serif", fontSize: "1.2rem", marginBottom: 12 }}>
              Quer receber mais detalhes?
            </h3>
            <p style={{ color: MUTED_COLOR, fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
              Me passa seu WhatsApp e eu te envio tudo que precisa saber para tomar a melhor decisão.
            </p>
            <input
              value={whatsappNum}
              onChange={ev => setWhatsappNum(ev.target.value)}
              placeholder="(00) 90000-0000"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 10,
                border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.03)",
                color: GOLD_LIGHT, fontSize: 15, outline: "none",
                boxSizing: "border-box", marginBottom: 16, textAlign: "center",
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setWhatsappModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: "none", color: MUTED_COLOR, cursor: "pointer", fontSize: 13 }}>
                Agora não
              </button>
              <button onClick={salvarWhatsapp} style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, #A07010, ${GOLD})`, color: "#0A0808", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Enviar meu contato
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
