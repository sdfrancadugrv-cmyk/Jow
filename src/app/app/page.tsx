"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import VoiceButton from "@/components/VoiceControl/VoiceButton";
import ChatHistory from "@/components/ChatHistory/ChatHistory";
import { useMemoryInit } from "@/hooks/useMemoryInit";
import { unlockJowAudio } from "@/hooks/useJow";
import { useJowStore } from "@/stores/jowStore";

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

// Proporções dos anéis em % do container (100, 138, 176, 214 de 240)
const RING_PCT = [41.7, 57.5, 73.3, 89.2];

function getRingDuration(state: string) {
  switch (state) {
    case "listening": return 0.7;
    case "thinking":  return 1.2;
    case "speaking":  return 1.0;
    default:          return 2.4;
  }
}

export default function AppPage() {
  const [activated, setActivated] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();
  const state = useJowStore((s) => s.state);
  useMemoryInit();

  function handleActivate() {
    unlockJowAudio();
    setActivated(true);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const ringDur = getRingDuration(state);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)",
      }}
    >
      {/* Névoa */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%),
          radial-gradient(ellipse 80% 30% at 50% 80%, rgba(8,12,30,0.6) 0%, transparent 70%)
        `,
      }} />

      {/* Partículas douradas */}
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

      {/* ── Nav bar responsiva ── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-3 gap-2">
        {/* Esquerda */}
        <div className="flex gap-1.5 flex-shrink-0">
          <a href="/app/whatsapp" className="text-[11px] font-bold"
            style={{ background: "#128C7E", color: "#fff", padding: "5px 10px", borderRadius: 20, textDecoration: "none", whiteSpace: "nowrap" }}>
            💬 Leads
          </a>
          <a href="/app/vendedor" className="text-[11px] font-bold"
            style={{ background: "rgba(212,160,23,0.15)", color: "#D4A017", padding: "5px 10px", borderRadius: 20, textDecoration: "none", border: "1px solid rgba(212,160,23,0.3)", whiteSpace: "nowrap" }}>
            🎯 Vendedor
          </a>
        </div>

        {/* Centro */}
        <button onClick={() => setShowHistory((v) => !v)}
          className="text-[9px] tracking-widest uppercase transition-opacity hover:opacity-70 flex-shrink-0"
          style={{ color: "#4A3A08", letterSpacing: "0.15em" }}>
          {showHistory ? "◀ fechar" : "histórico ▶"}
        </button>

        {/* Direita */}
        <button onClick={handleLogout}
          className="text-[9px] tracking-widest uppercase transition-opacity hover:opacity-70 flex-shrink-0"
          style={{ color: "#4A3A08", letterSpacing: "0.2em" }}>
          Sair
        </button>
      </div>

      {/* ── Conteúdo central ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 select-none pt-14 pb-10 w-full max-w-sm">

        {/* Título */}
        <h1 className="font-bold tracking-[0.35em] leading-none mb-1" style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(2.4rem, 9vw, 5rem)",
          background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 0 24px rgba(212,160,23,0.7)) drop-shadow(0 0 60px rgba(212,160,23,0.3))",
        }}>
          JENNIFER
        </h1>

        <p className="text-[10px] tracking-[0.5em] mb-6 uppercase" style={{ color: "#7A6010" }}>
          — AI ORCHESTRATOR —
        </p>

        {/* Microfone com anéis proporcionais ao container */}
        <div
          className="relative flex items-center justify-center mb-5"
          style={{
            width: "clamp(160px, 50vw, 240px)",
            height: "clamp(160px, 50vw, 240px)",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="absolute rounded-full" style={{
              width: `${RING_PCT[i]}%`,
              height: `${RING_PCT[i]}%`,
              border: `1.5px solid rgba(212,160,23,${0.55 - i * 0.1})`,
              boxShadow: `0 0 ${8 + i * 4}px rgba(212,160,23,${0.2 - i * 0.03})`,
              animation: `ringPulse ${ringDur + i * 0.3}s ease-out ${i * 0.35}s infinite`,
            }} />
          ))}

          <div className="relative z-10">
            <VoiceButton />
          </div>
        </div>

        {/* Histórico inline */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-xs"
            >
              <ChatHistory />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="absolute bottom-3 text-center px-4">
        <p className="text-[9px] tracking-[0.4em] uppercase" style={{ color: "#2A2208" }}>
          JENNIFER AI Orchestrator v0.1 — Powered by GPT-4o
        </p>
      </div>

      {/* ── Tela de ativação ── */}
      <AnimatePresence>
        {!activated && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
            style={{ background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)" }}
            onClick={handleActivate}
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: `
                radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
                radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%)
              `,
            }} />

            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {PARTICLES.map((p, i) => (
                <span key={i} className="absolute rounded-full" style={{
                  left: `${p.x}%`, top: `${p.y}%`,
                  width: p.s, height: p.s,
                  background: `rgba(212,170,0,${p.o})`,
                  animation: `twinkle ${p.d}s ease-in-out ${p.delay}s infinite alternate`,
                }} />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-6 select-none">
              <h1 className="font-bold tracking-[0.35em] leading-none mb-2" style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(2.8rem, 11vw, 6rem)",
                background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: "drop-shadow(0 0 24px rgba(212,160,23,0.7)) drop-shadow(0 0 60px rgba(212,160,23,0.3))",
              }}>
                JENNIFER
              </h1>

              <p className="text-[10px] tracking-[0.5em] mb-8 uppercase" style={{ color: "#7A6010" }}>
                — AI ORCHESTRATOR —
              </p>

              {/* Microfone de ativação */}
              <div className="relative flex items-center justify-center mb-8"
                style={{
                  width: "clamp(140px, 45vw, 220px)",
                  height: "clamp(140px, 45vw, 220px)",
                }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="absolute rounded-full" style={{
                    width: `${[40.9, 57.3, 73.6, 90][i]}%`,
                    height: `${[40.9, 57.3, 73.6, 90][i]}%`,
                    border: `1.5px solid rgba(212,160,23,${0.55 - i * 0.1})`,
                    boxShadow: `0 0 ${8 + i * 4}px rgba(212,160,23,${0.25 - i * 0.04})`,
                    animation: `ringPulse 2.4s ease-out ${i * 0.4}s infinite`,
                  }} />
                ))}

                <div className="absolute rounded-full" style={{
                  width: "45%", height: "45%",
                  background: "radial-gradient(circle at 38% 35%, #FFE57A, #D4A017 50%, #7A5A00 100%)",
                  boxShadow: "0 0 40px rgba(212,160,23,0.8), 0 0 80px rgba(212,160,23,0.35), inset 0 0 20px rgba(255,230,100,0.2)",
                }} />

                <svg className="relative z-10" width="48" height="48" viewBox="0 0 52 52" fill="none">
                  <rect x="18" y="4" width="16" height="26" rx="8" fill="url(#micGA)" />
                  <path d="M10 26c0 8.837 7.163 16 16 16s16-7.163 16-16" stroke="url(#micGA)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <line x1="26" y1="42" x2="26" y2="48" stroke="url(#micGA)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="18" y1="48" x2="34" y2="48" stroke="url(#micGA)" strokeWidth="2.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="micGA" x1="26" y1="4" x2="26" y2="52" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFE082" />
                      <stop offset="50%" stopColor="#D4A017" />
                      <stop offset="100%" stopColor="#7A5A00" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="px-10 py-3 rounded-full font-bold text-sm tracking-widest uppercase" style={{
                background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
                color: "#0A0808",
                boxShadow: "0 0 30px rgba(218,165,32,0.65), 0 4px 20px rgba(0,0,0,0.4)",
                letterSpacing: "0.2em",
              }}>
                COMANDAR AGORA
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
