"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  x: pr(i * 7.3) * 100,
  y: pr(i * 3.7) * 100,
  s: 1 + pr(i * 11.1) * 2.5,
  o: 0.25 + pr(i * 5.9) * 0.65,
  d: 2 + pr(i * 2.3) * 3,
  delay: pr(i * 1.7) * 4,
}));

const WAKE_WORDS = ["oi kadosh", "oi kadoch", "hey kadosh"];
type VoiceState = "idle" | "listening" | "thinking" | "speaking";

function matchWake(t: string) {
  const n = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return WAKE_WORDS.some((w) => n.includes(w));
}

function getRingDur(s: VoiceState) {
  return s === "listening" ? 0.55 : s === "thinking" ? 1.1 : s === "speaking" ? 0.75 : 2.4;
}

function getMicStyle(s: VoiceState) {
  if (s === "listening") return {
    background: "radial-gradient(circle at 38% 35%, #FFFFFF, #FFD700 40%, #D4A017 100%)",
    boxShadow: "0 0 60px rgba(255,215,0,1), 0 0 100px rgba(255,215,0,0.5)",
  };
  if (s === "thinking") return {
    background: "radial-gradient(circle at 38% 35%, #FFE57A, #D97706 50%, #7A4A00 100%)",
    boxShadow: "0 0 40px rgba(217,119,6,0.9), 0 0 80px rgba(217,119,6,0.4)",
  };
  if (s === "speaking") return {
    background: "radial-gradient(circle at 38% 35%, #FFE57A, #D4A017 50%, #7A5A00 100%)",
    boxShadow: "0 0 50px rgba(212,160,23,1), 0 0 90px rgba(212,160,23,0.5)",
  };
  return {
    background: "radial-gradient(circle at 38% 35%, #FFE57A, #D4A017 50%, #7A5A00 100%)",
    boxShadow: "0 0 40px rgba(212,160,23,0.8), 0 0 80px rgba(212,160,23,0.35), inset 0 0 20px rgba(255,230,100,0.2)",
  };
}

export default function LandingPage() {
  const [activated, setActivated] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [conversationActive, setConversationActive] = useState(false);
  const [statusText, setStatusText] = useState('diga "oi Kadosh"');
  const [bubble, setBubble] = useState("");
  const [srReady, setSrReady] = useState(false);

  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");

  const historyRef        = useRef<{ role: string; content: string }[]>([]);
  const activeRef         = useRef(false);
  const abortRef          = useRef(false);
  const audioRef          = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef  = useRef(false);
  const textModeRef       = useRef(false);
  const textResolveRef    = useRef<((v: string) => void) | null>(null);
  const cancelListenRef   = useRef(false);
  const router = useRouter();

  // Desbloqueia autoplay no gesto do usuário (deve ser síncrono)
  const ensureAudioUnlocked = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    try {
      const silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
      silent.volume = 0.001;
      silent.play().catch(() => {});
    } catch {}
  }, []);

  // ── TTS via OpenAI ───────────────────────────────────────────────
  const speak = useCallback(async (text: string): Promise<void> => {
    if (abortRef.current) return;
    try {
      const res = await fetch("/api/landing-speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || abortRef.current) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      return new Promise((resolve) => {
        const cleanup = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve(); };
        audio.onended = cleanup;
        audio.onerror = cleanup;
        audio.play().catch(cleanup);
      });
    } catch { /* silencioso */ }
  }, []);

  // ── Ouve UMA mensagem com 4s de inércia ─────────────────────────
  const listenOnce = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      if (abortRef.current) { resolve(""); return; }
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }

      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      let bestTranscript = "";
      let lastActivity = Date.now();
      let done = false;

      const finish = (text: string) => {
        if (done) return;
        done = true;
        clearInterval(silenceTimer);
        try { rec.stop(); } catch {}
        resolve(text);
      };

      // Verifica 4s de silêncio a cada 300ms
      const silenceTimer = setInterval(() => {
        if (abortRef.current || cancelListenRef.current) { cancelListenRef.current = false; finish(""); return; }
        if (Date.now() - lastActivity >= 4000) finish(bestTranscript);
      }, 300);

      rec.onresult = (e: any) => {
        lastActivity = Date.now();
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) { finish(e.results[i][0].transcript); return; }
          bestTranscript = e.results[i][0].transcript;
        }
      };
      rec.onerror = () => finish(bestTranscript);
      rec.onend   = () => finish(bestTranscript);
      try { rec.start(); } catch { finish(""); }
    });
  }, []);

  // ── Aguarda input de texto ────────────────────────────────────────
  const waitForText = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      textResolveRef.current = resolve;
    });
  }, []);

  // ── Input unificado (voz ou texto) ───────────────────────────────
  const getInput = useCallback((): Promise<string> => {
    if (textModeRef.current) {
      setVoiceState("listening");
      setStatusText("aguardando mensagem...");
      return waitForText();
    }
    return listenOnce();
  }, [listenOnce, waitForText]);

  // ── Enviar mensagem de texto ──────────────────────────────────────
  const handleTextSubmit = useCallback(() => {
    const val = textInput.trim();
    if (!val) return;
    setTextInput("");
    if (textResolveRef.current) {
      textResolveRef.current(val);
      textResolveRef.current = null;
    }
  }, [textInput]);

  // ── Alternar modo voz / texto ─────────────────────────────────────
  const toggleTextMode = useCallback(() => {
    const next = !textModeRef.current;
    textModeRef.current = next;
    setTextMode(next);
    if (next && voiceState === "listening") {
      // aborta microfone atual para entrar no waitForText
      cancelListenRef.current = true;
    }
    if (!next && textResolveRef.current) {
      // volta pra voz: cancela espera de texto pendente
      textResolveRef.current("");
      textResolveRef.current = null;
    }
  }, [voiceState]);

  // ── Encerrar conversa ────────────────────────────────────────────
  const stopConversation = useCallback(() => {
    abortRef.current  = true;
    activeRef.current = false;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (textResolveRef.current) { textResolveRef.current(""); textResolveRef.current = null; }
    setConversationActive(false);
    setVoiceState("idle");
    setBubble("");
    setStatusText('diga "oi Kadosh" ou clique no microfone');
    historyRef.current = [];
  }, []);

  // ── Processar mensagem em loop ───────────────────────────────────
  const processMessage = useCallback(async (userText: string) => {
    if (abortRef.current) return;

    // Silêncio: continua ouvindo
    if (!userText.trim()) {
      if (!abortRef.current && activeRef.current) {
        setVoiceState("listening");
        setStatusText("ouvindo...");
        const next = await getInput();
        await processMessage(next);
      } else {
        setVoiceState("idle");
        setConversationActive(false);
        activeRef.current = false;
        setStatusText('diga "oi Kadosh" ou clique no microfone');
      }
      return;
    }

    if (abortRef.current) return;
    setVoiceState("thinking");
    setStatusText("processando...");
    setBubble("");

    try {
      const res = await fetch("/api/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: historyRef.current }),
      });
      if (abortRef.current) return;
      const { text, action } = await res.json();

      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: userText },
        { role: "assistant", content: text },
      ].slice(-10);

      if (abortRef.current) return;
      setBubble(text);
      setVoiceState("speaking");
      setStatusText("respondendo...");
      await speak(text);

      if (abortRef.current) return;

      if (action === "goto_register") { router.push("/register"); return; }
      if (action === "goto_login")    { router.push("/login"); return; }
      if (action === "close") {
        setBubble("");
        setVoiceState("idle");
        setConversationActive(false);
        activeRef.current = false;
        setStatusText('diga "oi Kadosh" para continuar');
        return;
      }

      // Continua ouvindo no loop
      if (!abortRef.current) {
        setVoiceState("listening");
        setStatusText("ouvindo...");
        const next = await getInput();
        await processMessage(next);
      }
    } catch {
      if (!abortRef.current) {
        setVoiceState("idle");
        setConversationActive(false);
        activeRef.current = false;
        setStatusText('diga "oi Kadosh" ou clique no microfone');
      }
    }
  }, [speak, getInput, router]);

  // ── Iniciar conversa ─────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (activeRef.current) return;
    abortRef.current  = false;
    activeRef.current = true;
    setConversationActive(true);
    setVoiceState("listening");
    setStatusText("ouvindo...");
    setBubble("");
    const text = await getInput();
    await processMessage(text);
  }, [getInput, processMessage]);

  // ── Saudação ao ativar ───────────────────────────────────────────
  useEffect(() => {
    if (activated) greetAndListen();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activated]);

  // ── Wake word em background ──────────────────────────────────────
  useEffect(() => {
    if (!activated) return;
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    let stopped = false;
    let rec: any = null;

    function startWake() {
      if (stopped) return;
      rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "pt-BR";
      rec.maxAlternatives = 3;

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          for (let j = 0; j < e.results[i].length; j++) {
            if (matchWake(e.results[i][j].transcript)) {
              rec.stop();
              if (!activeRef.current) startConversation();
              return;
            }
          }
        }
      };
      rec.onerror = (e: any) => { if (e.error === "not-allowed") stopped = true; };
      rec.onend   = () => { if (!stopped && !activeRef.current) setTimeout(startWake, 400); };
      try { rec.start(); setSrReady(true); } catch {}
    }

    startWake();
    return () => { stopped = true; try { rec?.stop(); } catch {} };
  }, [activated, startConversation]);

  // ── Saudação automática ao ativar ────────────────────────────────
  const greetAndListen = useCallback(async () => {
    if (activeRef.current) return;
    abortRef.current  = false;
    activeRef.current = true;
    setConversationActive(true);
    setVoiceState("thinking");
    setStatusText("iniciando...");
    setBubble("");

    try {
      const res = await fetch("/api/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "SYSTEM_START", history: [] }),
      });
      const { text, action } = await res.json();
      if (abortRef.current) return;
      setBubble(text);
      setVoiceState("speaking");
      setStatusText("respondendo...");
      historyRef.current = [{ role: "assistant", content: text }];
      await speak(text);
      if (abortRef.current) return;
      if (action === "goto_register") { router.push("/register"); return; }
      if (action === "goto_login")    { router.push("/login"); return; }
      setVoiceState("listening");
      setStatusText("ouvindo...");
      const next = await getInput();
      await processMessage(next);
    } catch {
      activeRef.current = false;
      setConversationActive(false);
      setVoiceState("idle");
      setStatusText('diga "oi Kadosh" ou clique no microfone');
    }
  }, [speak, getInput, processMessage, router]);

  // ── Ativar com um clique ─────────────────────────────────────────
  const handleActivate = useCallback(() => {
    ensureAudioUnlocked();
    setActivated(true);
  }, [ensureAudioUnlocked]);

  const ringDur = getRingDur(voiceState);

  if (!activated) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
        style={{ background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)" }}
        onClick={handleActivate}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%)
          `,
        }} />
        <div className="relative z-10 flex flex-col items-center text-center px-6 select-none">
          <h1 className="font-bold tracking-[0.35em] leading-none mb-2" style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(3.5rem, 12vw, 7rem)",
            background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 24px rgba(212,160,23,0.7)) drop-shadow(0 0 60px rgba(212,160,23,0.3))",
          }}>
            KADOSH
          </h1>
          <p className="text-xs tracking-[0.55em] mb-16 uppercase" style={{ color: "#7A6010" }}>
            — AI ORCHESTRATOR —
          </p>
          <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
              background: "radial-gradient(circle, #FFE082, #D4A017)",
              boxShadow: "0 0 40px rgba(212,160,23,0.8)",
            }}>
              <svg width="32" height="32" viewBox="0 0 52 52" fill="none">
                <rect x="18" y="4" width="16" height="26" rx="8" fill="#0A0808" />
                <path d="M10 26c0 8.837 7.163 16 16 16s16-7.163 16-16" stroke="#0A0808" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <line x1="26" y1="42" x2="26" y2="48" stroke="#0A0808" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="18" y1="48" x2="34" y2="48" stroke="#0A0808" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm tracking-widest uppercase" style={{ color: "#D4A017" }}>
              toque para ativar
            </p>
            <p className="text-xs" style={{ color: "#4A3A08" }}>
              após isso diga "oi Kadosh" a qualquer momento
            </p>
          </div>
        </div>
        <style>{`
          @keyframes twinkle {
            from { opacity: 0.2; transform: scale(0.8); }
            to   { opacity: 1;   transform: scale(1.3); }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)" }}
    >
      {/* Névoa */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%),
          radial-gradient(ellipse 80% 30% at 50% 80%, rgba(8,12,30,0.6) 0%, transparent 70%)
        `,
      }} />

      {/* Partículas */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {PARTICLES.map((p, i) => (
          <span key={i} className="absolute rounded-full" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.s, height: p.s,
            background: `rgba(212,170,0,${p.o})`,
            boxShadow: `0 0 ${p.s * 2}px rgba(212,170,0,${p.o * 0.8})`,
            animation: `twinkle ${p.d}s ease-in-out ${p.delay}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* Login discreto */}
      <a href="/login"
        className="absolute top-5 right-6 z-20 text-[10px] tracking-widest uppercase transition-opacity hover:opacity-70"
        style={{ color: "#4A3A08", letterSpacing: "0.2em" }}>
        Já tenho acesso
      </a>

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 select-none">

        {/* Título */}
        <h1 className="font-bold tracking-[0.35em] leading-none mb-2" style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(3.5rem, 12vw, 7rem)",
          background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 0 24px rgba(212,160,23,0.7)) drop-shadow(0 0 60px rgba(212,160,23,0.3))",
        }}>
          KADOSH
        </h1>
        <p className="text-xs tracking-[0.55em] mb-14 uppercase" style={{ color: "#7A6010" }}>
          — AI ORCHESTRATOR —
        </p>

        {/* Microfone com anéis */}
        <button
          onClick={conversationActive ? stopConversation : startConversation}
          className="relative flex items-center justify-center mb-6 cursor-pointer focus:outline-none"
          style={{ width: 220, height: 220 }}
          aria-label={conversationActive ? "Encerrar conversa" : "Falar com Kadosh"}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="absolute rounded-full" style={{
              width: 90 + i * 38,
              height: 90 + i * 38,
              border: `1.5px solid rgba(212,160,23,${0.55 - i * 0.1})`,
              boxShadow: `0 0 ${8 + i * 4}px rgba(212,160,23,${0.25 - i * 0.04})`,
              animation: `ringPulse ${ringDur + i * 0.25}s ease-out ${i * 0.3}s infinite`,
            }} />
          ))}

          <div className="absolute rounded-full transition-all duration-500" style={{
            width: 100, height: 100,
            ...getMicStyle(voiceState),
          }} />

          <svg className="relative z-10" width="52" height="52" viewBox="0 0 52 52" fill="none">
            <rect x="18" y="4" width="16" height="26" rx="8" fill="url(#micGrad)" />
            <path d="M10 26c0 8.837 7.163 16 16 16s16-7.163 16-16" stroke="url(#micGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <line x1="26" y1="42" x2="26" y2="48" stroke="url(#micGrad)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="18" y1="48" x2="34" y2="48" stroke="url(#micGrad)" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="micGrad" x1="26" y1="4" x2="26" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFE082" />
                <stop offset="50%" stopColor="#D4A017" />
                <stop offset="100%" stopColor="#7A5A00" />
              </linearGradient>
            </defs>
          </svg>
        </button>

        {/* Balão do Kadosh */}
        {bubble ? (
          <div className="mb-6 px-5 py-3 rounded-2xl max-w-xs text-sm leading-relaxed"
            style={{ background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.3)", color: "#FFE082" }}>
            {bubble}
          </div>
        ) : (
          <p className="mb-6 text-base max-w-sm leading-relaxed" style={{ color: "#C8CDD8" }}>
            Ordene seus 300 agentes de IA e conquiste sua missão.
          </p>
        )}

        {/* Status */}
        <p className="text-[11px] tracking-widest uppercase mb-3 transition-all duration-300"
          style={{ color: voiceState === "idle" ? "#4A3A08" : "#D4A017" }}>
          {srReady ? statusText : "clique no microfone para falar"}
        </p>

        {/* Toggle voz / texto */}
        <button
          onClick={toggleTextMode}
          title={textMode ? "Voltar para conversa por voz" : "Conversar por texto"}
          className="mb-4 px-3 py-1 rounded-full text-[9px] tracking-widest uppercase transition-all duration-300 hover:opacity-80 focus:outline-none"
          style={{
            border: "1px solid rgba(212,160,23,0.3)",
            color: textMode ? "#D4A017" : "#3A2C06",
            background: textMode ? "rgba(212,160,23,0.08)" : "transparent",
          }}
        >
          {textMode ? "usar voz" : "usar texto"}
        </button>

        {/* Campo de texto (visível só em modo texto com conversa ativa) */}
        {textMode && conversationActive && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleTextSubmit(); }}
            className="flex gap-2 w-full max-w-xs mb-4"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="escreva aqui..."
              autoFocus
              className="flex-1 px-4 py-2 rounded-full text-sm bg-transparent outline-none text-input-kadosh"
              style={{
                border: "1px solid rgba(212,160,23,0.35)",
                color: "#FFE082",
              }}
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="px-4 py-2 rounded-full text-[10px] tracking-widest uppercase font-bold transition-all hover:opacity-80 disabled:opacity-30 focus:outline-none"
              style={{
                border: "1px solid rgba(212,160,23,0.35)",
                color: "#D4A017",
                background: "rgba(212,160,23,0.08)",
              }}
            >
              enviar
            </button>
          </form>
        )}

        {/* Botão CTA — alterna entre dourado e laranja */}
        <button
          onClick={conversationActive ? stopConversation : startConversation}
          className="px-10 py-4 rounded-full font-bold text-sm transition-all duration-300 hover:scale-105 active:scale-95"
          style={conversationActive ? {
            background: "linear-gradient(135deg, #C85000, #F97316, #C85000)",
            color: "#fff",
            boxShadow: "0 0 30px rgba(249,115,22,0.7), 0 4px 20px rgba(0,0,0,0.4)",
          } : {
            background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
            color: "#0A0808",
            boxShadow: "0 0 30px rgba(218,165,32,0.65), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {conversationActive
            ? "aperte para encerrar o diálogo"
            : 'diga "oi Kadosh" ou aperte aqui e faça uma pergunta'}
        </button>

        <p className="text-xs mt-4" style={{ color: "#2A2208" }}>
          R$97/mês · cancele quando quiser
        </p>
      </div>

      <style>{`
        @keyframes twinkle {
          from { opacity: 0.2; transform: scale(0.8); }
          to   { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);    opacity: 1; }
          70%  { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1);    opacity: 1; }
        }
        .text-input-kadosh::placeholder { color: #3A2C06; }
      `}</style>
    </main>
  );
}
