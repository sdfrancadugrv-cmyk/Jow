"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import AgentPanel from "@/components/AgentPanel/AgentPanel";
import VoiceButton from "@/components/VoiceControl/VoiceButton";
import ChatHistory from "@/components/ChatHistory/ChatHistory";
import EnergyLines from "@/components/EnergyLines/EnergyLines";
import { useMemoryInit } from "@/hooks/useMemoryInit";
import { unlockJowAudio } from "@/hooks/useJow";

const JowSphere = dynamic(() => import("@/components/JowSphere/JowSphere"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center gap-4">
      <div className="w-[280px] h-[280px] flex items-center justify-center">
        <div className="w-40 h-40 rounded-full bg-purple-900/40 animate-pulse shadow-[0_0_60px_#7C3AED55]" />
      </div>
      <h1 className="text-5xl font-bold tracking-[0.4em] text-purple-300">JOW</h1>
      <p className="text-xs tracking-widest text-purple-700">INICIANDO...</p>
    </div>
  ),
});

export default function AppPage() {
  const sphereRef = useRef<HTMLDivElement>(null!);
  const agentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [activated, setActivated] = useState(false);
  const router = useRouter();
  useMemoryInit();

  function handleActivate() {
    unlockJowAudio();
    setActivated(true);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at center, #0D0520 0%, #060610 50%, #0A0A0F 100%)" }}
    >
      {/* Grade tech de fundo */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124,58,237,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Botão de logout */}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-5 text-[10px] tracking-widest text-purple-700 hover:text-purple-400 uppercase transition-colors z-20"
      >
        Sair
      </button>

      <EnergyLines sphereRef={sphereRef} agentRefs={agentRefs} />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-16 w-full px-4">
        <div className="hidden md:flex">
          <AgentPanel agentRefs={agentRefs} />
        </div>

        <div className="flex flex-col items-center gap-6">
          <div ref={sphereRef}>
            <JowSphere />
          </div>
          <VoiceButton />
        </div>

        <ChatHistory />
      </div>

      <div className="absolute bottom-5 text-center">
        <p className="text-[9px] tracking-[0.5em] text-purple-900 uppercase">
          JOW AI Orchestrator v0.1 — Powered by GPT-4o
        </p>
      </div>

      {/* Tela de ativação */}
      <AnimatePresence>
        {!activated && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
            style={{ background: "radial-gradient(ellipse at center, #0D0520 0%, #060610 60%, #0A0A0F 100%)" }}
            onClick={handleActivate}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="flex flex-col items-center gap-6"
            >
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #4C1D95, #7C3AED)",
                  boxShadow: "0 0 60px rgba(124,58,237,0.5), 0 0 120px rgba(124,58,237,0.2)",
                }}
              >
                <span className="text-5xl">🎙️</span>
              </div>
              <h1 className="text-4xl font-bold tracking-[0.5em] text-purple-300">JOW</h1>
              <p className="text-sm tracking-widest text-purple-400 uppercase">Clique para ativar</p>
              <p className="text-xs text-purple-700 tracking-wider">Depois diga &quot;fala Jow&quot; a qualquer momento</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
