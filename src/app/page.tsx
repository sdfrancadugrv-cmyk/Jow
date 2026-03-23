"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// Partículas determinísticas
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
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [statusText, setStatusText] = useState('diga "oi Kadosh"');
  const [bubble, setBubble] = useState("");
  const [srReady, setSrReady] = useState(false);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const activeRef = useRef(false);
  const router = useRouter();

  // ── TTS via Web Speech API ───────────────────────────────────────
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "pt-BR";
      utter.rate = 1.0;
      utter.pitch = 1.05;

      // Preferência: voz feminina pt-BR se disponível
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find((v) =>
        v.lang.startsWith("pt") && v.name.toLowerCase().includes("female")
      ) || voices.find((v) => v.lang.startsWith("pt"));
      if (ptVoice) utter.voice = ptVoice;

      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }, []);

  // ── Gravar e transcrever (SpeechRecognition) ────────────────────
  const listenOnce = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { resolve(""); return; }
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 3;

      let done = false;
      const finish = (text: string) => { if (!done) { done = true; resolve(text); } };

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        finish(text);
      };
      rec.onerror = () => finish("");
      rec.onend = () => finish("");
      rec.start();

      // timeout de segurança 15s
      setTimeout(() => finish(""), 15000);
    });
  }, []);

  // ── Processar mensagem ──────────────────────────────────────────
  const processMessage = useCallback(async (userText: string) => {
    if (!userText.trim()) {
      setVoiceState("idle");
      setStatusText('diga "oi Kadosh" ou clique no microfone');
      activeRef.current = false;
      return;
    }

    setVoiceState("thinking");
    setStatusText("processando...");
    setBubble("");

    try {
      const res = await fetch("/api/landing-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: historyRef.current }),
      });
      const { text, action } = await res.json();

      historyRef.current = [
        ...historyRef.current,
        { role: "user", content: userText },
        { role: "assistant", content: text },
      ].slice(-10);

      setBubble(text);
      setVoiceState("speaking");
      setStatusText("respondendo...");
      await speak(text);

      if (action === "goto_register") { router.push("/register"); return; }
      if (action === "goto_login") { router.push("/login"); return; }
      if (action === "close") {
        setBubble("");
        setVoiceState("idle");
        setStatusText('diga "oi Kadosh" para continuar');
        activeRef.current = false;
        return;
      }

      // Continua a conversa — escuta próxima pergunta
      setVoiceState("listening");
      setStatusText("ouvindo...");
      const next = await listenOnce();
      await processMessage(next);

    } catch {
      setVoiceState("idle");
      setStatusText('diga "oi Kadosh" ou clique no microfone');
      activeRef.current = false;
    }
  }, [speak, listenOnce, router]);

  // ── Iniciar conversa ────────────────────────────────────────────
  const startConversation = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    window.speechSynthesis.cancel();
    setVoiceState("listening");
    setStatusText("ouvindo...");
    setBubble("");
    const text = await listenOnce();
    await processMessage(text);
  }, [listenOnce, processMessage]);

  // ── Wake word em background ─────────────────────────────────────
  useEffect(() => {
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
      rec.onend = () => { if (!stopped && !activeRef.current) setTimeout(startWake, 400); };
      try { rec.start(); setSrReady(true); } catch {}
    }

    startWake();
    return () => { stopped = true; try { rec?.stop(); } catch {} };
  }, [startConversation]);

  const ringDur = getRingDur(voiceState);

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

      {/* Link de login discreto */}
      <a href="/login" className="absolute top-5 right-6 z-20 text-[10px] tracking-widest uppercase transition-opacity hover:opacity-70"
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

        {/* Microfone com anéis — clicável */}
        <button
          onClick={startConversation}
          className="relative flex items-center justify-center mb-6 cursor-pointer focus:outline-none"
          style={{ width: 220, height: 220 }}
          aria-label="Falar com Kadosh"
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

          {/* Círculo dourado */}
          <div className="absolute rounded-full transition-all duration-500" style={{
            width: 100, height: 100,
            ...getMicStyle(voiceState),
          }} />

          {/* SVG Microfone */}
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

        {/* Balão de fala do Kadosh */}
        {bubble ? (
          <div className="mb-6 px-5 py-3 rounded-2xl max-w-xs text-sm leading-relaxed transition-all duration-300"
            style={{
              background: "rgba(212,160,23,0.1)",
              border: "1px solid rgba(212,160,23,0.3)",
              color: "#FFE082",
            }}>
            {bubble}
          </div>
        ) : (
          <p className="mb-6 text-base max-w-sm leading-relaxed" style={{ color: "#C8CDD8" }}>
            Ordene seus 300 agentes de IA e conquiste sua missão.
          </p>
        )}

        {/* Status de voz */}
        <p className="text-[11px] tracking-widest uppercase mb-10 transition-all duration-300"
          style={{ color: voiceState === "idle" ? "#4A3A08" : "#D4A017" }}>
          {srReady ? statusText : 'clique no microfone para falar'}
        </p>

        {/* Botão CTA */}
        <button
          onClick={startConversation}
          className="px-10 py-4 rounded-full font-bold text-sm transition-transform hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
            color: "#0A0808",
            boxShadow: "0 0 30px rgba(218,165,32,0.65), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          diga &quot;oi Kadosh&quot; ou aperte aqui e faça uma pergunta
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
      `}</style>
    </main>
  );
}
