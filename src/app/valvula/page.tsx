"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GREEN = "#1F7A63";
const LIGHT_GREEN = "#e8f5f1";

// ─── tipos ────────────────────────────────────────────────────────────────────
interface ChatMsg { role: "user" | "assistant"; content: string; }
interface FormData  { nome: string; telefone: string; endereco: string; opcao: "self" | "tecnico"; }
type Step = "sales" | "form" | "pix" | "done";
type VoiceState = "idle" | "thinking" | "speaking" | "listening";

const INTRO = `Olá! Eu sou a Sofia, consultora da HydroBlu. Eu ouço você, entendo o que você diz e respondo — tudo por voz! Estou aqui para te ajudar a economizar até quarenta por cento na conta de água. A HydroBlu é uma válvula inteligente que reduz o desperdício em qualquer torneira ou chuveiro, sem obras e sem complicação. Me conta: qual é o valor da sua conta de água por mês? Pode falar!`;

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// ─── componente de voz da Sofia ───────────────────────────────────────────────
function SofiaVoice({ onBuyClick }: { onBuyClick: () => void }) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [sofiaText, setSofiaText] = useState("");
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [started, setStarted] = useState(false);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [waveBars] = useState(() => Array.from({ length: 20 }, (_, i) => i));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // faz Sofia falar via TTS
  const speak = useCallback(async (text: string, msgs: ChatMsg[]) => {
    setSofiaText(text);
    setVoiceState("speaking");
    try {
      const res = await fetch("/api/valvula/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("tts failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setVoiceState("listening");
        startListening();
      };
      await audio.play();
    } catch {
      // fallback: Web Speech API
      if ("speechSynthesis" in window) {
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "pt-BR";
        utt.rate = 1.05;
        utt.onend = () => { setVoiceState("listening"); startListening(); };
        window.speechSynthesis.speak(utt);
      } else {
        setVoiceState("listening");
        startListening();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // inicia gravação do microfone
  const startListening = useCallback(async () => {
    try {
      const stream = streamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicPermission("granted");

      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        if (blob.size < 1000) { setVoiceState("listening"); startListening(); return; }
        await processAudio(blob);
      };

      mr.start();
      // para automaticamente após 8s de silêncio / fala do user
      setTimeout(() => { if (mr.state === "recording") mr.stop(); }, 8000);
    } catch {
      setMicPermission("denied");
      setVoiceState("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // para gravação manualmente
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // processa áudio → texto → IA → voz
  const processAudio = useCallback(async (blob: Blob) => {
    setVoiceState("thinking");
    try {
      // STT
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      const sttRes = await fetch("/api/valvula/transcribe", { method: "POST", body: fd });
      const { text: userText } = await sttRes.json();
      if (!userText?.trim()) { setVoiceState("listening"); startListening(); return; }

      setTranscript(userText);

      const newHistory: ChatMsg[] = [...history, { role: "user", content: userText }];

      // checar se menciona compra
      const buyWords = ["comprar", "quero", "compra", "pedir", "pedido", "finalizar", "sim", "quero comprar", "como compro"];
      const wantsBuy = buyWords.some(w => userText.toLowerCase().includes(w));

      // IA
      const aiRes = await fetch("/api/valvula/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory }),
      });
      const { reply } = await aiRes.json();

      const updatedHistory: ChatMsg[] = [...newHistory, { role: "assistant", content: reply }];
      setHistory(updatedHistory);

      if (wantsBuy) {
        onBuyClick();
        const buyReply = reply + " Abri o formulário de compra para você, é só preencher!";
        await speak(buyReply, updatedHistory);
      } else {
        await speak(reply, updatedHistory);
      }
    } catch {
      setVoiceState("listening");
      startListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, speak, startListening, onBuyClick]);

  // inicia Sofia automaticamente
  async function startSofia() {
    if (started) return;
    setStarted(true);
    const initial: ChatMsg[] = [{ role: "assistant", content: INTRO }];
    setHistory(initial);
    await speak(INTRO, initial);
  }

  // interrompe Sofia e ouve agora
  function interruptAndListen() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setVoiceState("listening");
    startListening();
  }

  const isSpeaking = voiceState === "speaking";
  const isListening = voiceState === "listening";
  const isThinking = voiceState === "thinking";

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 12,
    }}>

      {/* caixa de fala / status */}
      {started && (
        <div style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          border: `1px solid ${GREEN}30`,
          width: 300,
          overflow: "hidden",
        }}>
          {/* header Sofia */}
          <div style={{ background: GREEN, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
              boxShadow: isSpeaking ? "0 0 0 4px rgba(255,255,255,0.3)" : "none",
              animation: isSpeaking ? "pulse-ring 1.2s infinite" : "none",
            }}>💧</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Sofia</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                {isThinking ? "pensando..." : isListening ? "ouvindo você..." : isSpeaking ? "falando..." : "pronta"}
              </div>
            </div>
            {/* indicador de onda */}
            {isSpeaking && (
              <div style={{ display: "flex", alignItems: "center", gap: 2, height: 28 }}>
                {waveBars.slice(0, 7).map((_, i) => (
                  <div key={i} style={{
                    width: 3, borderRadius: 2,
                    background: "rgba(255,255,255,0.8)",
                    height: `${8 + Math.sin(Date.now() / 200 + i) * 8}px`,
                    animation: `wave-bar 0.6s ${i * 0.08}s ease-in-out infinite alternate`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* texto do que Sofia disse */}
          {sofiaText && (
            <div style={{ padding: "12px 16px 8px", maxHeight: 100, overflowY: "auto" }}>
              <p style={{ fontSize: 13, color: "#333", lineHeight: 1.5, margin: 0 }}>{sofiaText}</p>
            </div>
          )}

          {/* o que o usuário falou */}
          {transcript && (
            <div style={{ padding: "0 16px 10px" }}>
              <div style={{ background: "#f5f5f5", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "#666", borderLeft: `3px solid ${GREEN}` }}>
                Você: {transcript}
              </div>
            </div>
          )}

          {/* barra de ação */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
            {isListening && (
              <button
                onClick={stopListening}
                style={{
                  flex: 1, background: "#ef4444", color: "#fff", border: "none",
                  borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <span style={{ width: 10, height: 10, background: "#fff", borderRadius: "50%", display: "inline-block", animation: "blink 1s infinite" }} />
                Enviar resposta
              </button>
            )}
            {isSpeaking && (
              <button
                onClick={interruptAndListen}
                style={{
                  flex: 1, background: "#f5f5f5", color: "#555", border: "none",
                  borderRadius: 10, padding: "10px", fontSize: 13, cursor: "pointer",
                }}
              >
                🎙 Quero falar
              </button>
            )}
            {(voiceState === "idle" || isThinking) && (
              <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "#aaa", padding: "10px 0" }}>
                {isThinking ? "⏳ processando..." : ""}
              </div>
            )}
          </div>
        </div>
      )}

      {/* botão principal — pulsa no ritmo da fala */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {!started && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 13, color: "#333", fontWeight: 600 }}>
            👋 Fale comigo!
          </div>
        )}
        <button
          onClick={started ? (isListening ? stopListening : interruptAndListen) : startSofia}
          style={{
            width: 60, height: 60, borderRadius: "50%",
            background: isListening ? "#ef4444" : GREEN,
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26,
            boxShadow: isSpeaking
              ? `0 0 0 8px ${GREEN}40, 0 0 0 16px ${GREEN}20`
              : isListening
              ? "0 0 0 8px rgba(239,68,68,0.3)"
              : "0 4px 24px rgba(31,122,99,0.5)",
            animation: isSpeaking ? "sofia-pulse 1s ease-in-out infinite" : isListening ? "mic-pulse 1.2s ease-in-out infinite" : "none",
            transition: "all 0.3s",
          }}
          aria-label={started ? "Falar com Sofia" : "Iniciar conversa"}
        >
          {isListening ? "🎙" : isThinking ? "⏳" : "💧"}
        </button>
      </div>

      {/* permissão negada */}
      {micPermission === "denied" && (
        <div style={{ background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12, color: "#ef4444", maxWidth: 220, textAlign: "center" }}>
          Permita o microfone para conversar com a Sofia
        </div>
      )}

      <style>{`
        @keyframes sofia-pulse {
          0%, 100% { box-shadow: 0 0 0 6px ${GREEN}40, 0 0 0 12px ${GREEN}15; }
          50%       { box-shadow: 0 0 0 12px ${GREEN}30, 0 0 0 20px ${GREEN}08; }
        }
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 6px rgba(239,68,68,0.3); }
          50%       { box-shadow: 0 0 0 14px rgba(239,68,68,0.1); }
        }
        @keyframes wave-bar {
          from { height: 4px; }
          to   { height: 20px; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
      `}</style>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function ValvulaPage() {
  const [step, setStep] = useState<Step>("sales");
  const [form, setForm] = useState<FormData>({ nome: "", telefone: "", endereco: "", opcao: "tecnico" });
  const [submitting, setSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ qr: string; qrBase64: string; orderId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // polling pagamento
  useEffect(() => {
    if (step !== "pix" || !pixData) return;
    const interval = setInterval(async () => {
      setPollCount(c => c + 1);
      if (pollCount > 72) { clearInterval(interval); return; }
      try {
        const res = await fetch(`/api/valvula/orders?key=valvula2024`);
        const orders = await res.json();
        if (orders.find((o: any) => o.id === pixData.orderId && o.status === "pago")) {
          clearInterval(interval);
          setStep("done");
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [step, pixData, pollCount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.telefone || !form.endereco) return;
    setSubmitting(true);
    try {
      const valor = form.opcao === "tecnico" ? 127.50 : 67.90;
      const orderRes = await fetch("/api/valvula/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valor }),
      });
      const { id: orderId } = await orderRes.json();
      const checkRes = await fetch("/api/valvula/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, nome: form.nome, telefone: form.telefone, opcao: form.opcao, valor }),
      });
      const data = await checkRes.json();
      if (data.pixQr) {
        setPixData({ qr: data.pixQr, qrBase64: data.pixQrBase64, orderId });
        setStep("pix");
      }
    } catch { alert("Erro ao gerar pagamento. Tente novamente."); }
    finally { setSubmitting(false); }
  }

  function copyPix() {
    if (!pixData?.qr) return;
    navigator.clipboard.writeText(pixData.qr);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (step === "done") return (
    <main style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 80, marginBottom: 24 }}>💧</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: GREEN, marginBottom: 12 }}>Pagamento confirmado!</h1>
        <p style={{ color: "#555", fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
          Obrigado! Em breve entraremos em contato pelo WhatsApp para confirmar os detalhes da entrega.
        </p>
        <a href={`https://wa.me/5553999516012?text=Olá! Acabei de comprar a HydroBlu. Meu nome é ${encodeURIComponent(form.nome)}.`}
          target="_blank" rel="noopener noreferrer"
          style={{ background: "#25d366", color: "#fff", padding: "14px 32px", borderRadius: 12, fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
          💬 Falar no WhatsApp
        </a>
      </div>
    </main>
  );

  // ── PIX ───────────────────────────────────────────────────────────────────
  if (step === "pix") {
    const valor = form.opcao === "tecnico" ? "R$ 127,50" : "R$ 67,90";
    return (
      <main style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: GREEN, marginBottom: 8 }}>Pague via PIX</h2>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Valor: <strong style={{ color: GREEN }}>{valor}</strong></p>
          {pixData?.qrBase64 && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <img src={`data:image/png;base64,${pixData.qrBase64}`} alt="QR Code PIX" style={{ width: 200, height: 200, borderRadius: 12 }} />
            </div>
          )}
          <div style={{ background: "#f5f5f5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, wordBreak: "break-all", fontSize: 11, color: "#333", textAlign: "left" }}>
            {pixData?.qr}
          </div>
          <button onClick={copyPix} style={{ background: copied ? "#22c55e" : GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 12 }}>
            {copied ? "✅ Código copiado!" : "📋 Copiar código PIX"}
          </button>
          <p style={{ fontSize: 12, color: "#999" }}>Após o pagamento, a confirmação é automática.</p>
        </div>
      </main>
    );
  }

  // ── FORMULÁRIO ────────────────────────────────────────────────────────────
  if (step === "form") {
    const valor = form.opcao === "tecnico" ? "R$ 127,50" : "R$ 67,90";
    return (
      <main style={{ minHeight: "100vh", background: "#fff", padding: "40px 24px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <button onClick={() => setStep("sales")} style={{ background: "none", border: "none", color: GREEN, cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>← Voltar</button>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>Finalizar compra</h2>
          <p style={{ color: "#666", marginBottom: 28, fontSize: 14 }}>Preencha seus dados para receber a HydroBlu</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {[
              { key: "self",    label: "Instalo eu mesmo",  price: "R$ 67,90",  sub: "Entrega para todo o Brasil" },
              { key: "tecnico", label: "Com técnico",       price: "R$ 127,50", sub: "Pelotas e região", badge: true },
            ].map(op => (
              <div key={op.key} onClick={() => setForm(f => ({ ...f, opcao: op.key as "self"|"tecnico" }))}
                style={{ border: `2px solid ${form.opcao === op.key ? GREEN : "#e5e5e5"}`, borderRadius: 14, padding: "16px 14px", cursor: "pointer", background: form.opcao === op.key ? LIGHT_GREEN : "#fafafa", position: "relative", transition: "all 0.15s" }}>
                {op.badge && <div style={{ position: "absolute", top: -10, right: 10, background: GREEN, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.08em" }}>RECOMENDADO</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{op.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: GREEN }}>{op.price}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{op.sub}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <label style={lbl}>Nome completo *</label>
            <input style={inp} value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} placeholder="Seu nome completo" required />
            <label style={lbl}>WhatsApp *</label>
            <input style={inp} value={form.telefone} onChange={e => setForm(f => ({...f, telefone: formatPhone(e.target.value)}))} placeholder="(53) 99999-9999" required />
            <label style={lbl}>Endereço de entrega *</label>
            <input style={inp} value={form.endereco} onChange={e => setForm(f => ({...f, endereco: e.target.value}))} placeholder="Rua, número, bairro, cidade" required />
            <div style={{ background: LIGHT_GREEN, border: `1px solid ${GREEN}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: GREEN, fontWeight: 600 }}>
              💰 Total: {valor}
            </div>
            <button type="submit" disabled={submitting} style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%", opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Gerando PIX..." : "Gerar PIX e finalizar compra →"}
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#999", fontSize: 12 }}>
            🔒 Pagamento seguro via Mercado Pago
          </div>
        </div>

        {/* Sofia continua disponível no formulário */}
        <SofiaVoice onBuyClick={() => {}} />
      </main>
    );
  }

  // ── PÁGINA DE VENDAS ──────────────────────────────────────────────────────
  return (
    <main style={{ background: "#fff", color: "#1a1a1a", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* HERO */}
      <section style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #145948 100%)`, color: "#fff", padding: "60px 24px 50px", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20, textTransform: "uppercase" }}>
            💧 Tecnologia em economia de água
          </div>
          <h1 style={{ fontSize: "clamp(26px,5vw,46px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 20 }}>
            Você pode estar perdendo até metade do valor da sua conta de água sem perceber
          </h1>
          <p style={{ fontSize: 18, opacity: 0.9, lineHeight: 1.6, marginBottom: 32, maxWidth: 520, margin: "0 auto 32px" }}>
            A <strong>HydroBlu</strong> é a válvula economizadora que reduz até <strong>40% do consumo de água</strong> — sem obras, sem complicação.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => setStep("form")} style={{ background: "#fff", color: GREEN, border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>
              Quero economizar agora →
            </button>
          </div>
        </div>
      </section>

      {/* PRODUTO */}
      <section style={{ padding: "60px 24px", background: "#fafafa" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 800, color: "#1a1a1a" }}>Conheça a HydroBlu</h2>
            <p style={{ color: "#666", marginTop: 8, fontSize: 16 }}>Design compacto, instalação fácil, economia real</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {["/valvula/hydroblu_1.png", "/valvula/hydroblu_2_v2.png", "/valvula/hydroblu_3.png"].map((src, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>
                <img src={src} alt={`HydroBlu ${i+1}`} style={{ width: "100%", height: 220, objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALCULADORA */}
      <section style={{ padding: "60px 24px", background: LIGHT_GREEN }}>
        <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(20px,4vw,32px)", fontWeight: 800, color: GREEN, marginBottom: 8 }}>💰 Quanto você vai economizar?</h2>
          <p style={{ color: "#555", marginBottom: 32, fontSize: 15 }}>Sua conta hoje → com HydroBlu</p>
          <CalcSection />
        </div>
      </section>

      {/* VÍDEOS */}
      <section style={{ padding: "60px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 40, color: "#1a1a1a" }}>Veja como funciona</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
              <iframe width="100%" height="260" src="https://www.youtube.com/embed/A76CCMtsKGo" title="HydroBlu demo" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
              <iframe width="100%" height="260" src="https://www.youtube.com/embed/HtGnKHlcXgU" title="HydroBlu instalação" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section style={{ padding: "60px 24px", background: "#1a1a1a", color: "#fff" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 40 }}>Por que a HydroBlu?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {[
              { icon: "💧", title: "Até 40% de economia", desc: "Na conta de água logo no primeiro mês" },
              { icon: "⚙️", title: "Instalação simples",  desc: "Sem obras, encaixa em qualquer torneira" },
              { icon: "💰", title: "ROI em 2 meses",      desc: "A válvula se paga rapidamente" },
              { icon: "🌿", title: "Sustentável",         desc: "Menos desperdício, mais consciência" },
              { icon: "🔧", title: "Durável",             desc: "Material resistente para anos de uso" },
              { icon: "✅", title: "Garantia",            desc: "Satisfação garantida ou devolvemos" },
            ].map((b, i) => (
              <div key={i} style={{ background: "#252525", borderRadius: 14, padding: "20px 16px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{b.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff", fontSize: 15 }}>{b.title}</div>
                <div style={{ color: "#999", fontSize: 13, lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL */}
      <section style={{ padding: "60px 24px", background: "#fafafa" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 40, color: "#1a1a1a" }}>Quem já usa HydroBlu</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {["/valvula/prova_social_150_29.png", "/valvula/prova_social_230_166_corrigida.png", "/valvula/ws1.jpeg", "/valvula/ws3.jpeg"].map((img, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
                <img src={img} alt={`Resultado ${i+1}`} style={{ width: "100%", height: 200, objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PREÇOS */}
      <section style={{ padding: "60px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 8, color: "#1a1a1a" }}>Escolha seu plano</h2>
          <p style={{ textAlign: "center", color: "#666", marginBottom: 40, fontSize: 15 }}>Duas opções, uma missão: economizar água</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
            <div style={{ border: "2px solid #e5e5e5", borderRadius: 20, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Instalo eu mesmo</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: "#1a1a1a" }}>R$<span style={{ fontSize: 36 }}>67</span><span style={{ fontSize: 22 }}>,90</span></div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 8, marginBottom: 24 }}>pagamento único</div>
              <ul style={{ textAlign: "left", listStyle: "none", padding: 0, marginBottom: 28 }}>
                {["✅ Válvula HydroBlu", "✅ Manual de instalação", "✅ Suporte por WhatsApp", "✅ Garantia de satisfação"].map(item => (
                  <li key={item} style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>{item}</li>
                ))}
              </ul>
              <button onClick={() => { setForm(f => ({...f, opcao: "self"})); setStep("form"); }} style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                Comprar agora
              </button>
            </div>
            <div style={{ border: `2px solid ${GREEN}`, borderRadius: 20, padding: "32px 24px", textAlign: "center", position: "relative", background: LIGHT_GREEN }}>
              <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: GREEN, color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 16px", borderRadius: 20, whiteSpace: "nowrap" }}>MAIS ESCOLHIDO</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Com técnico</div>
              <div style={{ display: "inline-block", background: "#fff3cd", color: "#856404", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, marginBottom: 12, border: "1px solid #ffc10740" }}>
                📍 Disponível em Pelotas e região
              </div>
              <div style={{ fontSize: 48, fontWeight: 900, color: GREEN }}>R$<span style={{ fontSize: 36 }}>127</span><span style={{ fontSize: 22 }}>,50</span></div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 8, marginBottom: 24 }}>pagamento único</div>
              <ul style={{ textAlign: "left", listStyle: "none", padding: 0, marginBottom: 28 }}>
                {["✅ Válvula HydroBlu", "✅ Instalação por técnico", "✅ Garantia de funcionamento", "✅ Suporte pós-instalação", "✅ Resultado máximo garantido"].map(item => (
                  <li key={item} style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>{item}</li>
                ))}
              </ul>
              <button onClick={() => { setForm(f => ({...f, opcao: "tecnico"})); setStep("form"); }} style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                Quero com instalação →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "60px 24px", background: "#fafafa" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(20px,4vw,30px)", fontWeight: 800, textAlign: "center", marginBottom: 36, color: "#1a1a1a" }}>Perguntas frequentes</h2>
          {[
            { q: "Funciona em qualquer torneira?",   a: "Sim! A HydroBlu é compatível com a maioria das torneiras e pontos de água residenciais." },
            { q: "Precisa chamar encanador?",         a: "Não necessariamente. A opção 'instalo eu mesmo' vem com manual completo. Se preferir, oferecemos o pacote com técnico." },
            { q: "Em quanto tempo paga o investimento?", a: "Com economia média de 40%, famílias com conta de R$150+ recuperam em menos de 2 meses." },
            { q: "E se não funcionar?",               a: "Garantia de satisfação. Se não economizar como prometido, devolvemos seu dinheiro." },
          ].map((faq, i) => (
            <details key={i} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, border: "1px solid #ebebeb", padding: "16px 20px" }}>
              <summary style={{ fontWeight: 700, cursor: "pointer", fontSize: 15, color: "#1a1a1a" }}>{faq.q}</summary>
              <p style={{ color: "#666", marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: "70px 24px", background: `linear-gradient(135deg, ${GREEN} 0%, #145948 100%)`, color: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,5vw,42px)", fontWeight: 900, marginBottom: 16 }}>Comece a economizar hoje</h2>
          <p style={{ fontSize: 17, opacity: 0.9, marginBottom: 36, lineHeight: 1.6 }}>
            Cada dia sem a HydroBlu é dinheiro indo pelo ralo. Instale agora e veja a diferença na próxima conta.
          </p>
          <button onClick={() => setStep("form")} style={{ background: "#fff", color: GREEN, border: "none", borderRadius: 12, padding: "18px 48px", fontSize: 18, fontWeight: 800, cursor: "pointer", marginBottom: 16 }}>
            Garantir minha HydroBlu →
          </button>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Pagamento seguro via PIX • Envio imediato</div>
        </div>
      </section>

      {/* ── SOFIA VOZ FIXADA ── */}
      <SofiaVoice onBuyClick={() => setStep("form")} />
    </main>
  );
}

// ─── calculadora ──────────────────────────────────────────────────────────────
function CalcSection() {
  const [conta, setConta] = useState(150);
  const economia = Math.round(conta * 0.40);
  const novaFatura = conta - economia;
  const payback = (67.90 / economia).toFixed(1);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 14, color: "#555", display: "block", marginBottom: 8 }}>Minha conta de água: <strong style={{ color: GREEN }}>R$ {conta}</strong>/mês</label>
        <input type="range" min={50} max={800} step={10} value={conta} onChange={e => setConta(Number(e.target.value))} style={{ width: "100%", accentColor: GREEN }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginTop: 4 }}>
          <span>R$ 50</span><span>R$ 800</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 12px", border: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#e53e3e" }}>R$ {conta}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Conta atual</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 12px", border: `1px solid ${GREEN}` }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>R$ {novaFatura}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Com HydroBlu</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 12px", border: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a" }}>R$ {economia}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Economia/mês</div>
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 14, color: "#666" }}>
        💡 A válvula se paga em apenas <strong style={{ color: GREEN }}>{payback} meses</strong>
      </p>
    </div>
  );
}

// ─── estilos form ─────────────────────────────────────────────────────────────
const lbl: React.CSSProperties = { fontSize: 11, color: "#888", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 };
const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e5e5e5", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#1a1a1a", outline: "none", marginBottom: 16, boxSizing: "border-box", fontFamily: "inherit" };
