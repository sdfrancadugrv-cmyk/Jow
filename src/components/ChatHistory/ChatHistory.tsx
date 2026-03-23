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
      <p className="text-[10px] tracking-widest text-purple-500 uppercase mb-2 text-center">
        Conversa
      </p>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        <AnimatePresence>
          {conversation.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-purple-700 text-xs mt-8"
            >
              Diga "fala Kadosh" para começar
            </motion.p>
          ) : (
            conversation.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`px-3 py-2 rounded-lg text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-purple-900/40 border border-purple-700/30 text-purple-200 ml-2"
                    : "bg-[#0F0F1A] border border-purple-800/20 text-gray-300 mr-2"
                }`}
              >
                <span
                  className={`block text-[9px] tracking-wider mb-1 ${
                    msg.role === "user" ? "text-purple-400" : "text-purple-600"
                  }`}
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
