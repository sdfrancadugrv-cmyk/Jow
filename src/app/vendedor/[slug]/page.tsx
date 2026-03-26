"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const MUTED = "#7A6018";

type Msg = { role: "user" | "assistant"; content: string };
type VideoState = "idle" | "playing" | "paused" | "ended";

function extrairYoutubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function PaginaVendasPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [produto, setProduto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mensagens, setMensagens] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>("idle");
  const [videoVisivel, setVideoVisivel] = useState(false);
  const [videoAssistido, setVideoAssistido] = useState(false);
  const [whatsappInput, setWhatsappInput] = useState("");
  const [pedindoWhatsapp, setPedindoWhatsapp] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carrega produto e abre conversa
  useEffect(() => {
    fetch(`/api/vendedor/produto/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) return;
        setProduto(data);
        const abertura = data.estrutura?.abertura || `Olá! Estou aqui para apresentar ${data.nome}. Como posso ajudar?`;
        setMensagens([{ role: "assistant", content: abertura }]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  // Scroll automático
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, videoVisivel]);

  // YouTube IFrame API
  useEffect(() => {
    if (!produto?.videoUrl) return;
    const videoId = extrairYoutubeId(produto.videoUrl);
    if (!videoId) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player("yt-player", {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { playerReadyRef.current = true; },
          onStateChange: (e: any) => {
            const YT = (window as any).YT.PlayerState;
            if (e.data === YT.PLAYING) {
              setVideoState("playing");
            } else if (e.data === YT.PAUSED) {
              setVideoState("paused");
              if (!videoAssistido) {
                setVideoAssistido(true);
                setTimeout(() => adicionarMensagemAssistente("O que achou? Ficou alguma dúvida sobre o que viu?"), 800);
              }
            } else if (e.data === YT.ENDED) {
              setVideoState("ended");
              setVideoAssistido(true);
              setTimeout(() => adicionarMensagemAssistente("Que tal? O vídeo mostra bem como funciona na prática. O que você achou?"), 800);
            }
          },
        },
      });
    };
  }, [produto]);

  function adicionarMensagemAssistente(texto: string) {
    setMensagens(prev => [...prev, { role: "assistant", content: texto }]);
  }

  const enviar = useCallback(async (textoOverride?: string) => {
    const texto = (textoOverride ?? input).trim();
    if (!texto || enviando) return;
    if (videoState === "playing") return; // Kadosh silenciado durante vídeo

    const novasMensagens: Msg[] = [...mensagens, { role: "user", content: texto }];
    setMensagens(novasMensagens);
    setInput("");
    setEnviando(true);

    try {
      const res = await fetch("/api/vendedor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, mensagens: novasMensagens, videoAssistido }),
      });
      const data = await res.json();

      if (data.acao === "REPRODUZIR_VIDEO" && produto?.videoUrl && !videoAssistido) {
        setMensagens(prev => [...prev, { role: "assistant", content: data.resposta }]);
        setTimeout(() => {
          setVideoVisivel(true);
          if (playerReadyRef.current && playerRef.current) {
            playerRef.current.playVideo();
          }
        }, 800);
      } else if (data.acao === "PEDIR_WHATSAPP") {
        setMensagens(prev => [...prev, { role: "assistant", content: data.resposta }]);
        setPedindoWhatsapp(true);
      } else {
        setMensagens(prev => [...prev, { role: "assistant", content: data.resposta || "..." }]);
      }
    } catch {
      setMensagens(prev => [...prev, { role: "assistant", content: "Desculpe, ocorreu um erro. Pode repetir?" }]);
    } finally {
      setEnviando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, mensagens, enviando, slug, videoState, videoAssistido, produto]);

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: GOLD, fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}>carregando...</p>
    </main>
  );

  if (!produto) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: MUTED }}>Produto não encontrado.</p>
    </main>
  );

  const estrutura = produto.estrutura || {};

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Hero */}
      <div style={{
        padding: "40px 20px 32px",
        textAlign: "center",
        borderBottom: "1px solid rgba(212,160,23,0.1)",
        background: "radial-gradient(ellipse at 50% 0%, rgba(212,160,23,0.08) 0%, transparent 70%)",
      }}>
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>
          Kadosh Vendedor
        </p>
        <h1 style={{
          fontFamily: "Georgia, serif", fontSize: "clamp(1.8rem, 6vw, 3rem)",
          background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          marginBottom: 12, letterSpacing: "0.05em",
        }}>
          {produto.nome}
        </h1>
        {estrutura.proposta && (
          <p style={{ color: "#C8CDD8", fontSize: "clamp(14px, 3vw, 17px)", maxWidth: 500, margin: "0 auto 20px", lineHeight: 1.6 }}>
            {estrutura.proposta}
          </p>
        )}

        {/* Benefícios */}
        {estrutura.beneficios?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 560, margin: "0 auto" }}>
            {estrutura.beneficios.map((b: string, i: number) => (
              <span key={i} style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12,
                background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.2)",
                color: GOLD_LIGHT,
              }}>
                ✓ {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vídeo (aparece quando Kadosh acionar) */}
      {videoVisivel && produto.videoUrl && (
        <div style={{
          padding: "20px 16px",
          background: "rgba(0,0,0,0.4)",
          borderBottom: "1px solid rgba(212,160,23,0.1)",
        }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
              {videoState === "playing" ? "▶ reproduzindo..." : "⏸ vídeo"}
            </p>
            <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "16/9", background: "#000" }}>
              <div id="yt-player" style={{ width: "100%", height: "100%" }} />
            </div>
          </div>
        </div>
      )}

      {/* Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", maxWidth: 600, margin: "0 auto", width: "100%", padding: "0 16px" }}>

        <div
          ref={chatRef}
          style={{
            flex: 1, overflowY: "auto", padding: "20px 0",
            display: "flex", flexDirection: "column", gap: 12,
            maxHeight: "calc(100vh - 420px)", minHeight: 200,
          }}
        >
          {mensagens.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginRight: 8,
                  background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, marginTop: 2,
                }}>
                  K
                </div>
              )}
              <div style={{
                maxWidth: "75%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.role === "user" ? "rgba(212,160,23,0.15)" : "rgba(255,255,255,0.05)",
                border: m.role === "user" ? "1px solid rgba(212,160,23,0.3)" : "1px solid rgba(255,255,255,0.08)",
                color: m.role === "user" ? GOLD_LIGHT : "#C8CDD8",
                fontSize: 14, lineHeight: 1.5,
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Kadosh silenciado durante vídeo */}
          {videoState === "playing" && (
            <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>K</div>
              <span style={{ color: MUTED, fontSize: 12, fontStyle: "italic" }}>assistindo ao vídeo...</span>
            </div>
          )}

          {enviando && (
            <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>K</div>
              <span style={{ color: MUTED, fontSize: 13 }}>digitando...</span>
            </div>
          )}
        </div>

        {/* Input WhatsApp (quando Kadosh pede) */}
        {pedindoWhatsapp && (
          <div style={{ padding: "12px 0", display: "flex", gap: 8 }}>
            <input
              value={whatsappInput}
              onChange={e => setWhatsappInput(e.target.value)}
              placeholder="Seu WhatsApp: 55 11 99999-9999"
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 30,
                border: "1px solid rgba(212,160,23,0.35)", background: "rgba(255,255,255,0.04)",
                color: GOLD_LIGHT, fontSize: 14, outline: "none",
              }}
            />
            <button
              onClick={() => {
                if (whatsappInput.trim()) {
                  setPedindoWhatsapp(false);
                  enviar(`Meu WhatsApp é ${whatsappInput}`);
                }
              }}
              style={{
                padding: "12px 20px", borderRadius: 30, border: "none",
                background: `linear-gradient(135deg, #A07010, ${GOLD})`,
                color: "#0A0808", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              Enviar
            </button>
          </div>
        )}

        {/* Input principal */}
        {!pedindoWhatsapp && (
          <div style={{ padding: "12px 0 20px", display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
              placeholder={videoState === "playing" ? "Assista ao vídeo primeiro..." : "Tire suas dúvidas..."}
              disabled={videoState === "playing" || enviando}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 30,
                border: "1px solid rgba(212,160,23,0.25)", background: "rgba(255,255,255,0.04)",
                color: GOLD_LIGHT, fontSize: 14, outline: "none",
                opacity: videoState === "playing" ? 0.4 : 1,
                cursor: videoState === "playing" ? "not-allowed" : "text",
              }}
            />
            <button
              onClick={() => enviar()}
              disabled={videoState === "playing" || enviando || !input.trim()}
              style={{
                padding: "12px 20px", borderRadius: 30, border: "none",
                background: (videoState === "playing" || !input.trim()) ? "rgba(212,160,23,0.15)" : `linear-gradient(135deg, #A07010, ${GOLD})`,
                color: (videoState === "playing" || !input.trim()) ? MUTED : "#0A0808",
                fontWeight: 700, fontSize: 13,
                cursor: (videoState === "playing" || !input.trim()) ? "not-allowed" : "pointer",
              }}
            >
              →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
