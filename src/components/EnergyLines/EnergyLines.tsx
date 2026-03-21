"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJowStore, AGENTS } from "@/stores/jowStore";

interface LineData {
  agentName: string;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface EnergyLinesProps {
  sphereRef: React.RefObject<HTMLDivElement>;
  agentRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

export default function EnergyLines({ sphereRef, agentRefs }: EnergyLinesProps) {
  const activeAgents = useJowStore((s) => s.activeAgents);
  const [lines, setLines] = useState<LineData[]>([]);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  useEffect(() => {
    setDimensions({ w: window.innerWidth, h: window.innerHeight });
    const handleResize = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (activeAgents.length === 0) {
      setLines([]);
      return;
    }

    const sphereEl = sphereRef.current;
    if (!sphereEl) return;

    const sphereRect = sphereEl.getBoundingClientRect();
    const cx = sphereRect.left + sphereRect.width / 2;
    const cy = sphereRect.top + sphereRect.height / 2;

    const newLines: LineData[] = [];
    activeAgents.forEach((agentName) => {
      const el = agentRefs.current[agentName];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ax = rect.left + rect.width / 2;
      const ay = rect.top + rect.height / 2;
      const agent = AGENTS.find((a) => a.name === agentName);
      if (!agent) return;
      newLines.push({ agentName, color: agent.color, x1: cx, y1: cy, x2: ax, y2: ay });
    });

    setLines(newLines);
  }, [activeAgents, sphereRef, agentRefs, dimensions]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="fixed inset-0 pointer-events-none"
      style={{ width: "100vw", height: "100vh", zIndex: 20 }}
    >
      <defs>
        {lines.map((line) => (
          <filter key={`glow-${line.agentName}`} id={`glow-${line.agentName}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      <AnimatePresence>
        {lines.map((line) => {
          const dx = line.x2 - line.x1;
          const dy = line.y2 - line.y1;
          const length = Math.sqrt(dx * dx + dy * dy);

          return (
            <g key={line.agentName}>
              {/* Linha base (trilho) */}
              <motion.line
                x1={line.x1} y1={line.y1}
                x2={line.x2} y2={line.y2}
                stroke={line.color}
                strokeWidth="1"
                strokeOpacity="0.2"
                strokeDasharray="4 6"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />

              {/* Linha brilhante animada */}
              <motion.line
                x1={line.x1} y1={line.y1}
                x2={line.x2} y2={line.y2}
                stroke={line.color}
                strokeWidth="2"
                strokeDasharray={`${length * 0.3} ${length}`}
                filter={`url(#glow-${line.agentName})`}
                initial={{ strokeDashoffset: 0, opacity: 0 }}
                animate={{
                  strokeDashoffset: [-length, length * 1.5],
                  opacity: [0, 1, 1, 0.8],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  strokeDashoffset: { duration: 0.8, repeat: Infinity, ease: "linear" },
                  opacity: { duration: 0.3 },
                }}
              />

              {/* Partícula viajando pela linha */}
              <motion.circle
                r="4"
                fill={line.color}
                filter={`url(#glow-${line.agentName})`}
                initial={{ cx: line.x1, cy: line.y1, opacity: 0, scale: 0 }}
                animate={{
                  cx: [line.x1, line.x2, line.x1],
                  cy: [line.y1, line.y2, line.y1],
                  opacity: [0, 1, 1, 0],
                  scale: [0.5, 1.2, 0.5],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Halo no ponto de chegada (agente) */}
              <motion.circle
                cx={line.x2} cy={line.y2} r="12"
                fill="none"
                stroke={line.color}
                strokeWidth="1.5"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0.8, 1.6], opacity: [0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            </g>
          );
        })}
      </AnimatePresence>
    </svg>
  );
}
