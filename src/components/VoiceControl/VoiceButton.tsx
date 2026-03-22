"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useJowStore } from "@/stores/jowStore";
import { useJow, unlockJowAudio, stopJowAudio } from "@/hooks/useJow";

const WAKE_WORDS = ["fala jow", "fala jo", "fala joe", "fala djo"];
const STOP_WORDS = ["encerrar conversa", "encerra conversa", "encerrar a conversa"];

function matchesWakeWord(transcript: string): boolean {
  const t = transcript.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return WAKE_WORDS.some((w) => t.includes(w));
}

function matchesStopWord(transcript: string): boolean {
  const t = transcript.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return STOP_WORDS.some((w) => t.includes(w));
}

// VAD — Voice Activity Detection
// Analisa apenas frequências de voz humana: 300Hz–3400Hz
// Ignora barulho ambiente (baixas frequências, ventilador, AC, etc.)
const VOICE_FREQ_MIN = 300;   // Hz
const VOICE_FREQ_MAX = 3400;  // Hz
const VOICE_THRESHOLD = 18;   // energia mínima para considerar "voz" (0-255)
const SILENCE_TIMEOUT_MS = 5000;
const SAMPLE_RATE = 44100;
const FFT_SIZE = 2048;

function getVoiceEnergy(analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>): number {
  analyser.getByteFrequencyData(data);
  const binHz = SAMPLE_RATE / FFT_SIZE;
  const minBin = Math.floor(VOICE_FREQ_MIN / binHz);
  const maxBin = Math.floor(VOICE_FREQ_MAX / binHz);
  let sum = 0;
  for (let i = minBin; i <= maxBin; i++) sum += data[i];
  return sum / (maxBin - minBin);
}

export default function VoiceButton() {
  const { state, setState, setListening, isListening } = useJowStore();
  const { processMessage, transcribe, setOnReady } = useJow();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef(false);
  const activeConversationRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const [wakeWordReady, setWakeWordReady] = useState(false);
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  const stopRecording = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    setSilenceCountdown(null);
    silenceStartRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (isListeningRef.current) return;
    try {
      unlockJowAudio(); // desbloqueia o elemento de áudio durante gesto do usuário
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
        setSilenceCountdown(null);
        silenceStartRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 2000) {
          setState("idle");
          setListening(false);
          activeConversationRef.current = false;
          return;
        }

        setListening(false);
        setState("thinking");
        const text = await transcribe(blob);
        if (matchesStopWord(text)) {
          activeConversationRef.current = false;
          setState("idle");
          return;
        }
        if (text.trim()) {
          await processMessage(text);
        } else {
          setState("idle");
          activeConversationRef.current = false;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      isListeningRef.current = true;
      setListening(true);
      setState("listening");

      // VAD — detecta silêncio SÓ nas frequências de voz humana
      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

      function tick() {
        if (!isListeningRef.current) return;
        const voiceEnergy = getVoiceEnergy(analyser, data);

        if (voiceEnergy < VOICE_THRESHOLD) {
          // silêncio de voz detectado
          if (!silenceStartRef.current) silenceStartRef.current = Date.now();
          const elapsed = Date.now() - silenceStartRef.current;
          const rem = Math.ceil((SILENCE_TIMEOUT_MS - elapsed) / 1000);
          setSilenceCountdown(rem > 0 ? rem : 0);
          if (elapsed >= SILENCE_TIMEOUT_MS) {
            stopRecording();
            return;
          }
        } else {
          // voz detectada — reseta timer
          silenceStartRef.current = null;
          setSilenceCountdown(null);
        }
        animFrameRef.current = requestAnimationFrame(tick);
      }
      animFrameRef.current = requestAnimationFrame(tick);

    } catch {
      alert("Permissão de microfone negada.");
      setState("idle");
    }
  }, [setState, setListening, transcribe, processMessage, stopRecording]);

  useEffect(() => {
    setOnReady(() => {
      if (activeConversationRef.current && !isListeningRef.current) {
        startRecording();
      }
    });
  }, [setOnReady, startRecording]);

  // Wake word detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    let stopped = false;
    let rec: any = null;

    function startRec() {
      if (stopped) return;
      rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "pt-BR";
      rec.maxAlternatives = 5;

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          for (let j = 0; j < e.results[i].length; j++) {
            const transcript = e.results[i][j].transcript;
            if (matchesStopWord(transcript) && activeConversationRef.current) {
              rec.stop();
              activeConversationRef.current = false;
              if (isListeningRef.current) stopRecording();
              setState("idle");
              return;
            }
            if (matchesWakeWord(transcript)) {
              rec.stop();
              if (!isListeningRef.current) {
                activeConversationRef.current = true;
                startRecording();
              }
              return;
            }
          }
        }
      };

      rec.onerror = (e: any) => { if (e.error === "not-allowed") stopped = true; };
      rec.onend = () => { if (!stopped) setTimeout(startRec, 400); };
      try { rec.start(); setWakeWordReady(true); } catch {}
    }

    startRec();
    return () => { stopped = true; try { rec?.stop(); } catch {} };
  }, [startRecording]);

  const handleClick = () => {
    unlockJowAudio(); // garante desbloqueio em todo clique
    if (isListening) {
      stopRecording();
    } else if (activeConversationRef.current) {
      activeConversationRef.current = false;
      setState("idle");
    } else {
      activeConversationRef.current = true;
      startRecording();
    }
  };

  const handleStop = () => {
    stopJowAudio();
    stopRecording();
    activeConversationRef.current = false;
    setState("idle");
  };

  const isActive = isListening;
  const isProcessing = state === "thinking" || state === "speaking";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center gap-4">
        {isProcessing && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleStop}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #7F1D1D, #DC2626)",
              boxShadow: "0 0 20px rgba(220,38,38,0.5)",
            }}
            title="Parar"
          >
            <span className="text-base">⏹</span>
          </motion.button>
        )}
        <motion.button
          onClick={handleClick}
          disabled={isProcessing}
          whileTap={{ scale: isProcessing ? 1 : 0.93 }}
          className="relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isActive
              ? "linear-gradient(135deg, #1D4ED8, #3B82F6)"
              : isProcessing
              ? "linear-gradient(135deg, #D97706, #F59E0B)"
              : "linear-gradient(135deg, #4C1D95, #7C3AED)",
            boxShadow: isActive
              ? "0 0 30px rgba(59,130,246,0.6)"
              : isProcessing
              ? "0 0 30px rgba(245,158,11,0.6)"
              : "0 0 20px rgba(124,58,237,0.4)",
          }}
        >
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-400"
              animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          )}
          <span className="text-2xl relative z-10">
            {isActive ? "🎙️" : isProcessing ? "⏳" : "🎙️"}
          </span>
        </motion.button>

        {silenceCountdown !== null && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-900/80 text-blue-300 text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
          >
            sem voz... {silenceCountdown}s
          </motion.div>
        )}
        </div>
      </div>

      <p className="text-[10px] tracking-widest uppercase transition-all duration-300"
        style={{ color: isActive ? "#60A5FA" : isProcessing ? "#F59E0B" : "#7C3AED" }}>
        {isActive ? "ouvindo voz • 5s sem falar envia"
          : isProcessing ? "processando..."
          : wakeWordReady ? '"fala Jow" ou clique'
          : "clique para falar"}
      </p>
    </div>
  );
}
