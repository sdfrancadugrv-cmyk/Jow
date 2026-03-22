"use client";

import { useCallback, useEffect, useRef } from "react";
import { useJowStore, AgentName } from "@/stores/jowStore";

let onReadyCallback: (() => void) | null = null;

// Elemento de áudio persistente — criado uma vez, reutilizado sempre
let _audioEl: HTMLAudioElement | null = null;
let _audioUnlocked = false;

function getAudioEl(): HTMLAudioElement {
  if (typeof window === "undefined") throw new Error("no window");
  if (!_audioEl) {
    _audioEl = document.createElement("audio");
    _audioEl.id = "jow-voice";
    document.body.appendChild(_audioEl);
  }
  return _audioEl;
}

// Para o áudio imediatamente
export function stopJowAudio() {
  try {
    if (_audioEl) {
      _audioEl.pause();
      if (_audioEl.src.startsWith("blob:")) URL.revokeObjectURL(_audioEl.src);
      _audioEl.src = "";
    }
    if (typeof window !== "undefined") speechSynthesis.cancel();
  } catch {}
}

// Chama isso dentro de um handler de clique do usuário para desbloquear
export function unlockJowAudio() {
  if (_audioUnlocked) return;
  try {
    const el = getAudioEl();
    // silent mp3 de 1 frame — força o browser a desbloquear o elemento
    el.src = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIwLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjM1AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV";
    const p = el.play();
    if (p) p.then(() => { el.pause(); el.src = ""; _audioUnlocked = true; }).catch(() => {});
  } catch {}
}

export function useJow() {
  const { setState, setActiveAgents, addMessage, addHistory } = useJowStore();

  const setOnReady = useCallback((cb: () => void) => {
    onReadyCallback = cb;
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    setState("speaking");

    const done = () => {
      setState("idle");
      setTimeout(() => onReadyCallback?.(), 800);
    };

    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`TTS erro ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = getAudioEl();

      // limpa src anterior
      el.pause();
      if (el.src.startsWith("blob:")) URL.revokeObjectURL(el.src);

      el.src = url;
      el.onended = () => { URL.revokeObjectURL(url); done(); };
      el.onerror = () => { URL.revokeObjectURL(url); done(); };

      const playPromise = el.play();
      if (playPromise) {
        await playPromise.catch(async (err) => {
          console.warn("[JOW] play() bloqueado, usando speechSynthesis:", err);
          // fallback final: voz nativa do navegador
          await new Promise<void>((resolve) => {
            const u = new SpeechSynthesisUtterance(text);
            u.lang = "pt-BR"; u.rate = 0.92; u.pitch = 0.85;
            u.onend = () => resolve();
            u.onerror = () => resolve();
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
          });
          done();
        });
      }
    } catch (err) {
      console.error("[JOW speak]", err);
      done();
    }
  }, [setState]);

  const processMessage = useCallback(async (text: string) => {
    addMessage("user", text);
    setState("thinking");
    try {
      const currentHistory = useJowStore.getState().history;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: currentHistory }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.agentsUsed?.length > 0) {
        setActiveAgents(data.agentsUsed as AgentName[]);
        await new Promise((r) => setTimeout(r, 1200));
        setActiveAgents([]);
      }

      addHistory(text, data.response);
      addMessage("jow", data.response);
      await speak(data.response);
    } catch (err) {
      console.error("[JOW processMessage]", err);
      setState("error");
      setTimeout(() => { setState("idle"); onReadyCallback?.(); }, 2000);
    }
  }, [addMessage, addHistory, setState, setActiveAgents, speak]);

  const transcribe = useCallback(async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");
    const res = await fetch("/api/voice/transcribe", { method: "POST", body: formData });
    const data = await res.json();
    return data.text ?? "";
  }, []);

  return { processMessage, transcribe, speak, setOnReady };
}
