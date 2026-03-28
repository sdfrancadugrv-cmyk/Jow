"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import VoiceButton from "@/components/VoiceControl/VoiceButton";
import ChatHistory from "@/components/ChatHistory/ChatHistory";
import { useMemoryInit } from "@/hooks/useMemoryInit";
import { unlockJowAudio } from "@/hooks/useJow";
import { useJowStore } from "@/stores/jowStore";

// Partículas determinísticas (mesmas da landing)
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

// Velocidade dos anéis por estado
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
        background:
          "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)",
      }}
    >
      {/* Névoa */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%),
            radial-gradient(ellipse 80% 30% at 50% 80%, rgba(8,12,30,0.6) 0%, transparent 70%)
          `,
        }}
      />

      {/* Partículas douradas */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.s,
              height: p.s,
              background: `rgba(212,170,0,${p.o})`,
              boxShadow: `0 0 ${p.s * 2}px rgba(212,170,0,${p.o * 0.8})`,
              animation: `twinkle ${p.d}s ease-in-out ${p.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Botões de navegação */}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-5 text-[10px] tracking-widest uppercase z-20 transition-opacity hover:opacity-70"
        style={{ color: "#4A3A08", letterSpacing: "0.2em" }}
      >
        Sair
      </button>

      <a
        href="/app/whatsapp"
        className="absolute top-4 left-5 z-20 text-xs font-bold tracking-wider"
        style={{
          background: "#128C7E",
          color: "#fff",
          padding: "5px 14px",
          borderRadius: 20,
          textDecoration: "none",
        }}
      >
        💬 Leads
      </a>

      {/* Botão histórico */}
      <button
        onClick={() => setShowHistory((v) => !v)}
        className="absolute top-4 z-20 text-[10px] tracking-widest uppercase transition-opacity hover:opacity-70"
        style={{ color: "#4A3A08", left: "50%", transform: "translateX(-50%)", letterSpacing: "0.2em" }}
      >
        {showHistory ? "◀ fechar" : "histórico ▶"}
      </button>

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 select-none">

        {/* Título */}
        <h1
          className="font-bold tracking-[0.35em] leading-none mb-2"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(3rem, 10vw, 5.5rem)",
            background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter:
              "drop-shadow(0 0 24px rgba(212,160,23,0.7)) drop-shadow(0 0 60px rgba(212,160,23,0.3))",
          }}
        >
          JENNIFER
        </h1>

        <p
          className="text-xs tracking-[0.55em] mb-10 uppercase"
          style={{ color: "#7A6010" }}
        >
          — AI ORCHESTRATOR —
        </p>

        {/* Microfone com anéis + VoiceButton */}
        <div
          className="relative flex items-center justify-center mb-8"
          style={{ width: 240, height: 240 }}
        >
          {/* Anéis decorativos */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 100 + i * 38,
                height: 100 + i * 38,
                border: `1.5px solid rgba(212,160,23,${0.55 - i * 0.1})`,
                boxShadow: `0 0 ${8 + i * 4}px rgba(212,160,23,${0.2 - i * 0.03})`,
                animation: `ringPulse ${ringDur + i * 0.3}s ease-out ${i * 0.35}s infinite`,
              }}
            />
          ))}

          {/* VoiceButton centralizado */}
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
              className="w-72 max-w-full"
            >
              <ChatHistory />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="absolute bottom-5 text-center">
        <p
          className="text-[9px] tracking-[0.4em] uppercase"
          style={{ color: "#2A2208" }}
        >
          JENNIFER AI Orchestrator v0.1 — Powered by GPT-4o
        </p>
      </div>

      {/* Tela de ativação — idêntica à landing */}
      <AnimatePresence>
        {!activated && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
            style={{
              background:
                "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)",
            }}
            onClick={handleActivate}
          >
            {/* névoa overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `
                  radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
                  radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%)
                `,
              }}
            />

            {/* partículas */}
            <div className="absolute inset-0 pointer-events-none" aria-hidden>
              {PARTICLES.map((p, i) => (
                <span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: p.s,
                    height: p.s,
                    background: `rgba(212,170,0,${p.o})`,
                    animation: `twinkle ${p.d}s ease-in-out ${p.delay}s infinite alternate`,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-6 select-none">
              {/* Título */}
              <h1
                className="font-bold tracking-[0.35em] leading-none mb-2"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(3.5rem, 12vw, 7rem)",
                  background:
                    "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter:
                    "drop-shadow(0 0 24px rgba(212,160,23,0.7)) drop-shadow(0 0 60px rgba(212,160,23,0.3))",
                }}
              >
                JENNIFER
              </h1>

              <p
                className="text-xs tracking-[0.55em] mb-14 uppercase"
                style={{ color: "#7A6010" }}
              >
                — AI ORCHESTRATOR —
              </p>

              {/* Microfone com anéis pulsantes */}
              <div
                className="relative flex items-center justify-center mb-14"
                style={{ width: 220, height: 220 }}
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: 90 + i * 38,
                      height: 90 + i * 38,
                      border: `1.5px solid rgba(212,160,23,${0.55 - i * 0.1})`,
                      boxShadow: `0 0 ${8 + i * 4}px rgba(212,160,23,${0.25 - i * 0.04})`,
                      animation: `ringPulse 2.4s ease-out ${i * 0.4}s infinite`,
                    }}
                  />
                ))}

                {/* Círculo dourado */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 100,
                    height: 100,
                    background:
                      "radial-gradient(circle at 38% 35%, #FFE57A, #D4A017 50%, #7A5A00 100%)",
                    boxShadow:
                      "0 0 40px rgba(212,160,23,0.8), 0 0 80px rgba(212,160,23,0.35), inset 0 0 20px rgba(255,230,100,0.2)",
                  }}
                />

                {/* SVG Microfone */}
                <svg className="relative z-10" width="52" height="52" viewBox="0 0 52 52" fill="none">
                  <rect x="18" y="4" width="16" height="26" rx="8" fill="url(#micG2)" />
                  <path d="M10 26c0 8.837 7.163 16 16 16s16-7.163 16-16" stroke="url(#micG2)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                  <line x1="26" y1="42" x2="26" y2="48" stroke="url(#micG2)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="18" y1="48" x2="34" y2="48" stroke="url(#micG2)" strokeWidth="2.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="micG2" x1="26" y1="4" x2="26" y2="52" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFE082" />
                      <stop offset="50%" stopColor="#D4A017" />
                      <stop offset="100%" stopColor="#7A5A00" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <p className="text-base mb-10 max-w-sm" style={{ color: "#C8CDD8" }}>
                Ordene seus 300 agentes de IA e conquiste sua missão.
              </p>

              {/* Botão */}
              <div
                className="px-14 py-4 rounded-full font-bold text-sm tracking-widest uppercase"
                style={{
                  background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
                  color: "#0A0808",
                  boxShadow: "0 0 30px rgba(218,165,32,0.65), 0 4px 20px rgba(0,0,0,0.4)",
                  letterSpacing: "0.2em",
                }}
              >
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
