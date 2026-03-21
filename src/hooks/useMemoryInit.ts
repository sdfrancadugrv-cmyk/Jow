"use client";

import { useEffect } from "react";
import { useJowStore } from "@/stores/jowStore";

export function useMemoryInit() {
  const { loadHistory, addMessage } = useJowStore();

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/memory");
        const data = await res.json();

        if (data.recentHistory?.length > 0) {
          loadHistory(data.recentHistory);
          // mostra na UI quantas mensagens foram recuperadas
          const count = data.recentHistory.length / 2;
          addMessage("jow", `Memória carregada — lembro das últimas ${Math.floor(count)} trocas. ${data.summaries?.length > 0 ? `Tenho também ${data.summaries.length} resumo(s) de conversas anteriores.` : ""}`);
        }
      } catch {
        // silencia erro — memória vazia é ok
      }
    }
    init();
  }, []); // roda só uma vez ao montar
}
