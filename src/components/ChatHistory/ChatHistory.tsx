"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useJowStore } from "@/stores/jowStore";

export default function ChatHistory() {
  const conversation = useJowStore((s) => s.conversation);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  return (
    <div className="flex flex-col w-full md:w-48 h-48 md:h-[360px]">
      <p className="text-[10px] tracking-widest uppercase mb-2 text-center" style={{ color: "#5A3030" }}>
        Conversa
      </p>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        <AnimatePresence>
          {conversation.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-xs mt-8" style={{ color: "#5A3030" }}
            >
              Diga "oi Kadosh" para começar
            </motion.p>
          ) : (
            conversation.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="px-3 py-2 rounded-lg text-xs leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "rgba(139,26,46,0.2)", border: "1px solid rgba(139,26,46,0.3)", color: "#E0D4D0", marginLeft: 8 }
                    : { background: "#0D0808", border: "1px solid rgba(139,26,46,0.15)", color: "#C4A8A4", marginRight: 8 }
                }
              >
                <span
                  className="block text-[9px] tracking-wider mb-1"
                  style={{ color: msg.role === "user" ? "#C4A8A4" : "#7A4040" }}
                >
                  {msg.role === "user" ? "VOCÊ" : "KADOSH"}
                </span>
                {msg.content}
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
