"use client";

import { useState, useEffect } from "react";
import { useJowStore, JowState } from "@/stores/jowStore";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.innerWidth < 768);
  }, []);
  return mobile;
}

// ── Cores por estado ─────────────────────────────────────────────
function getColors(state: JowState) {
  switch (state) {
    case "idle":      return { spike: "#C4A8A4", bright: "#E0D4D0", core: "#8B1A2E", glow: "rgba(139,26,46,0.5)" };
    case "listening": return { spike: "#E0D4D0", bright: "#F0E8E4", core: "#6B1520", glow: "rgba(139,26,46,0.65)" };
    case "thinking":  return { spike: "#FCD34D", bright: "#FEF9C3", core: "#F59E0B", glow: "rgba(252,211,77,0.6)" };
    case "speaking":  return { spike: "#E8D0CC", bright: "#F4EAE8", core: "#9A2535", glow: "rgba(196,168,164,0.6)" };
    case "error":     return { spike: "#F87171", bright: "#FEE2E2", core: "#DC2626", glow: "rgba(248,113,113,0.6)" };
  }
}

function getSpinDur(state: JowState) {
  switch (state) {
    case "idle":      return 28;
    case "listening": return 14;
    case "thinking":  return 8;
    case "speaking":  return 16;
    case "error":     return 6;
  }
}

function getCoreDur(state: JowState) {
  switch (state) {
    case "idle":      return "2.8s";
    case "listening": return "1.2s";
    case "thinking":  return "0.7s";
    case "speaking":  return "1.6s";
    case "error":     return "0.5s";
  }
}

function getCharInterval(state: JowState) {
  switch (state) {
    case "idle":      return 400;
    case "listening": return 200;
    case "thinking":  return 90;
    case "speaking":  return 160;
    case "error":     return 70;
  }
}

const CX = 140;
const CY = 140;
const CHARS = "0123456789ABCDEF";

function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function buildSpikes(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const innerR = 26 + pr(i * 3) * 8;
    const outerR = 70 + pr(i * 7 + 1) * 52;
    const tipR   = outerR + 10;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x1: CX + cos * innerR, y1: CY + sin * innerR,
      x2: CX + cos * outerR, y2: CY + sin * outerR,
      tipX: CX + cos * tipR, tipY: CY + sin * tipR,
      opacity: 0.45 + pr(i * 11) * 0.55,
      sw: 0.6 + pr(i * 5) * 0.9,
      showLabel: i % 4 === 0,
    };
  });
}

const SPIKES_DESKTOP = buildSpikes(240);
const SPIKES_MOBILE  = buildSpikes(80);

const LABEL_DESKTOP = SPIKES_DESKTOP.filter((s) => s.showLabel);
const LABEL_MOBILE  = SPIKES_MOBILE.filter((s) => s.showLabel);

const INIT_CHARS_DESKTOP = LABEL_DESKTOP.map((_, i) => CHARS[Math.floor(pr(i * 13) * CHARS.length)]);
const INIT_CHARS_MOBILE  = LABEL_MOBILE.map((_, i) => CHARS[Math.floor(pr(i * 13) * CHARS.length)]);

// ── Componente ───────────────────────────────────────────────────
export default function JowSphere() {
  const state = useJowStore((s) => s.state);
  const isMobile = useIsMobile();
  const SPIKES      = isMobile ? SPIKES_MOBILE  : SPIKES_DESKTOP;
  const LABEL_SPIKES = isMobile ? LABEL_MOBILE  : LABEL_DESKTOP;
  const INIT_CHARS   = isMobile ? INIT_CHARS_MOBILE : INIT_CHARS_DESKTOP;
  const svgSize      = isMobile ? 200 : 280;

  const [chars, setChars] = useState<string[]>(INIT_CHARS_DESKTOP);
  const c = getColors(state);

  useEffect(() => {
    setChars(INIT_CHARS);
  }, [isMobile]); // eslint-disable-line

  useEffect(() => {
    const interval = isMobile ? Math.max(getCharInterval(state) * 3, 800) : getCharInterval(state);
    const iv = setInterval(() => {
      setChars((prev) =>
        prev.map((ch) => (pr(Date.now() * Math.random()) < 0.35 ? CHARS[Math.floor(Math.random() * CHARS.length)] : ch))
      );
    }, interval);
    return () => clearInterval(iv);
  }, [state, isMobile]); // eslint-disable-line

  const spinDur  = isMobile ? getSpinDur(state) * 2 : getSpinDur(state);
  const coreDur  = getCoreDur(state);

  const stateLabel: Record<JowState, string> = {
    idle:      "AGUARDANDO",
    listening: "OUVINDO...",
    thinking:  "PROCESSANDO...",
    speaking:  "RESPONDENDO...",
    error:     "ERRO",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG da esfera */}
      <div
        style={{
          width: svgSize,
          height: svgSize,
          filter: `drop-shadow(0 0 30px ${c.glow})`,
          transition: "filter 0.6s ease",
        }}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox="0 0 280 280"
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="spikeGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="coreGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grupo rotacionando — espinhos + números */}
          <g
            style={{
              transformOrigin: `${CX}px ${CY}px`,
              animation: `jowSpin ${spinDur}s linear infinite`,
              transition: "animation-duration 0.8s ease",
            }}
          >
            {/* Espinhos */}
            {SPIKES.map((s, i) => (
              <line
                key={i}
                x1={s.x1} y1={s.y1}
                x2={s.x2} y2={s.y2}
                stroke={c.spike}
                strokeWidth={s.sw}
                opacity={s.opacity}
                style={{ transition: "stroke 0.5s ease" }}
              />
            ))}

            {/* Números nas pontas */}
            {LABEL_SPIKES.map((s, i) => (
              <text
                key={i}
                x={s.tipX}
                y={s.tipY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fontFamily="'Courier New', monospace"
                fontWeight="bold"
                fill={c.bright}
                opacity="0.85"
                filter="url(#spikeGlow)"
                style={{ transition: "fill 0.5s ease" }}
              >
                {chars[i] ?? "0"}
              </text>
            ))}
          </g>

          {/* Anel pulsante externo (não rotaciona) */}
          <circle cx={CX} cy={CY} r="32" fill="none" stroke={c.core} strokeWidth="1" opacity="0.25"
            style={{ transition: "stroke 0.5s ease" }}>
            <animate attributeName="r"       values="32;48;32" dur={coreDur} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur={coreDur} repeatCount="indefinite" />
          </circle>
          <circle cx={CX} cy={CY} r="20" fill="none" stroke={c.core} strokeWidth="1.5" opacity="0.5"
            style={{ transition: "stroke 0.5s ease" }}>
            <animate attributeName="r"       values="20;28;20" dur={coreDur} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur={coreDur} repeatCount="indefinite" />
          </circle>

          {/* Núcleo central */}
          <circle cx={CX} cy={CY} r="11" fill={c.core} opacity="0.55" filter="url(#coreGlow)"
            style={{ transition: "fill 0.5s ease" }} />
          <circle cx={CX} cy={CY} r="5"  fill={c.bright} filter="url(#coreGlow)"
            style={{ transition: "fill 0.5s ease" }} />
        </svg>
      </div>

      {/* Keyframes de rotação via style tag */}
      <style>{`
        @keyframes jowSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Nome e estado */}
      <div className="text-center">
        <h1
          className="text-5xl font-bold tracking-[0.4em] transition-all duration-500"
          style={{
            color: c.spike,
            textShadow: `0 0 25px ${c.glow}, 0 0 50px ${c.glow}`,
          }}
        >
          JENNIFER
        </h1>
        <p
          className="text-xs tracking-[0.3em] mt-1 transition-all duration-300"
          style={{ color: c.spike, opacity: 0.7 }}
        >
          {stateLabel[state]}
        </p>
      </div>
    </div>
  );
}
