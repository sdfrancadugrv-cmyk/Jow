"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useJowStore, AGENTS } from "@/stores/jowStore";

interface AgentPanelProps {
  agentRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

export default function AgentPanel({ agentRefs }: AgentPanelProps) {
  const activeAgents = useJowStore((s) => s.activeAgents);

  return (
    <div className="flex flex-col gap-2 w-40">
      <p className="text-[10px] tracking-widest uppercase mb-1 text-center" style={{ color: "#5A3030" }}>
        Agentes
      </p>
      {AGENTS.map((agent, i) => {
        const isActive = activeAgents.includes(agent.name);
        return (
          <motion.div
            key={agent.name}
            ref={(el) => { agentRefs.current[agent.name] = el; }}
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: isActive ? 1 : 0.45,
              x: 0,
              scale: isActive ? 1.05 : 1,
            }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors duration-300 overflow-hidden"
            style={{
              borderColor: isActive ? agent.color : "#1F0A0A",
              backgroundColor: isActive ? `${agent.color}18` : "#0D0808",
              boxShadow: isActive ? `0 0 18px ${agent.color}55, inset 0 0 12px ${agent.color}15` : "none",
            }}
          >
            {/* Pulso de fundo quando ativo */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{ backgroundColor: agent.color }}
                  initial={{ opacity: 0.25 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.7, repeat: Infinity }}
                />
              )}
            </AnimatePresence>

            {/* Scan line quando ativo */}
            {isActive && (
              <motion.div
                className="absolute inset-y-0 w-6 opacity-20"
                style={{ background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)` }}
                animate={{ x: [-24, 160] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}

            <motion.span
              className="text-lg relative z-10"
              animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.5, repeat: isActive ? Infinity : 0 }}
            >
              {agent.icon}
            </motion.span>

            <div className="relative z-10 flex-1">
              <p
                className="text-xs font-medium transition-colors duration-300"
                style={{ color: isActive ? agent.color : "#6B7280" }}
              >
                {agent.label}
              </p>
              <AnimatePresence>
                {isActive && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[9px] leading-none" style={{ color: "#7A4040" }}
                  >
                    consultando...
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Dot pulsante */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.6, 1] }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full relative z-10"
                  style={{ backgroundColor: agent.color }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
