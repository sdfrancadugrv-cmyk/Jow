"use client";

import { useRef, useState, useCallback } from "react";

type AppState = "idle" | "listening" | "processing" | "speaking";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type VoxResponse = {
  type: "message" | "site" | "proposal";
  message?: string;
  html?: string;
  title?: string;
  slug?: string;
  admin_senha?: string;
  items?: string[];
  hours?: number;
  deadline?: string;
  price?: string;
};

export default function VoxPage() {
  const [state, setState] = useState<AppState>("idle");
  const [lastResponse, setLastResponse] = useState<VoxResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus] = useState("Segure para falar");
  const [hourlyRate, setHourlyRate] = useState(150);
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const speak = useCallback(async (text: string) => {
    setState("speaking");
    setStatus("Vox está falando...");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play();
      });
      URL.revokeObjectURL(url);
    } catch {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "pt-BR";
      speechSynthesis.speak(utter);
      await new Promise<void>((resolve) => { utter.onend = () => resolve(); });
    } finally {
      setState("idle");
      setStatus("Segure para falar");
    }
  }, []);

  const sendToVox = useCallback(
    async (userText: string) => {
      setState("processing");
      setStatus("Vox está pensando...");

      const updatedMessages: Message[] = [...messages, { role: "user", content: userText }];
      setMessages(updatedMessages);
      setTimeout(scrollToBottom, 80);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages }),
        });
        const data: VoxResponse = await res.json();
        setLastResponse(data);
        setDeployUrl(null);

        const assistantMsg = data.message || "Pronto!";
        setMessages([...updatedMessages, { role: "assistant", content: assistantMsg }]);
        setTimeout(scrollToBottom, 80);

        await speak(assistantMsg);
      } catch {
        await speak("Ocorreu um erro. Tente novamente.");
      }
    },
    [messages, speak, scrollToBottom]
  );

  const handlePressStart = useCallback(async () => {
    if (state !== "idle") return;
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 2000) {
          setState("idle");
          setStatus("Segure para falar");
          return;
        }

        setState("processing");
        setStatus("Processando...");

        try {
          const form = new FormData();
          form.append("audio", blob, "audio.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const { text } = await res.json();
          if (text?.trim()) {
            await sendToVox(text.trim());
          } else {
            setState("idle");
            setStatus("Não ouvi nada. Tente de novo.");
          }
        } catch {
          setState("idle");
          setStatus("Erro. Tente de novo.");
        }
      };

      recorder.start(100);
      setState("listening");
      setStatus("Gravando... solte quando terminar");
    } catch {
      setState("idle");
      setStatus("Microfone bloqueado.");
    }
  }, [state, sendToVox]);

  const handlePressEnd = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text || state !== "idle") return;
    setTextInput("");
    await sendToVox(text);
  }, [textInput, state, sendToVox]);

  const handleDeploy = async () => {
    if (!lastResponse?.html) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: lastResponse.html, projectName: lastResponse.title || "vox-site" }),
      });
      const data = await res.json();
      if (data.url) {
        setDeployUrl(data.url);
        await speak("Site publicado! O link ficou na tela.");
      }
    } catch {
      await speak("Erro ao fazer o deploy.");
    } finally {
      setDeploying(false);
    }
  };

  const isListening  = state === "listening";
  const isProcessing = state === "processing";
  const isSpeaking   = state === "speaking";
  const isBusy       = state !== "idle";

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: "var(--bg)" }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="flex flex-col"
        style={{
          width: "360px",
          minWidth: "360px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: "var(--text)" }}>Vox</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Criador de sites por voz</p>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: showSettings ? "var(--accent-light)" : "var(--bg)",
              border: "1px solid var(--border)",
              color: showSettings ? "var(--accent)" : "var(--muted)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </button>
        </div>

        {/* Settings */}
        {showSettings && (
          <div
            className="px-5 py-3 fade-in"
            style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>Valor/hora:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "var(--muted)" }}>R$</span>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded-lg text-xs"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--accent-light)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Olá! Sou o Vox.</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--muted)" }}>
                  Descreva o site que você quer<br />e eu crio na hora.
                </p>
              </div>

              {/* Sugestões */}
              <div className="flex flex-col gap-2 w-full mt-2">
                {[
                  "Crie um site para minha pizzaria",
                  "Quero um site de barbearia moderno",
                  "Site para academia de ginástica",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setTextInput(s); }}
                    className="text-left px-3.5 py-2.5 rounded-xl text-xs transition-all"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--muted)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mr-2 mt-0.5"
                    style={{ background: "var(--accent)" }}
                  >
                    <span className="text-white text-xs font-bold">V</span>
                  </div>
                )}
                <div
                  className="max-w-[230px] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "var(--accent)",
                          color: "#fff",
                          borderBottomRightRadius: "6px",
                        }
                      : {
                          background: "var(--bg)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderBottomLeftRadius: "6px",
                        }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom: voice + input */}
        <div
          className="px-5 py-5 flex flex-col items-center gap-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {/* Status */}
          <div className="flex items-center gap-2 h-4">
            {isBusy && (
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: isListening ? "var(--danger)" : "var(--accent)",
                  animation: "pulse-ring 1.2s ease-in-out infinite",
                }}
              />
            )}
            <p
              className="text-xs font-medium transition-all"
              style={{ color: isListening ? "var(--danger)" : "var(--muted)" }}
            >
              {status}
            </p>
          </div>

          {/* Voice Button */}
          <div className="relative flex items-center justify-center">
            {isListening && (
              <>
                <div
                  className="absolute rounded-full listening-ring"
                  style={{
                    width: "88px",
                    height: "88px",
                    background: "rgba(220,38,38,0.08)",
                    border: "1px solid rgba(220,38,38,0.25)",
                  }}
                />
                <div
                  className="absolute rounded-full listening-ring2"
                  style={{
                    width: "112px",
                    height: "112px",
                    background: "rgba(220,38,38,0.04)",
                  }}
                />
              </>
            )}

            <button
              onPointerDown={handlePressStart}
              onPointerUp={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onPointerCancel={handlePressEnd}
              disabled={isProcessing || isSpeaking}
              className="w-16 h-16 rounded-full flex items-center justify-center select-none transition-all duration-150 relative z-10"
              style={{
                background: isListening
                  ? "var(--danger)"
                  : isSpeaking
                  ? "var(--success)"
                  : "var(--accent)",
                boxShadow: isListening
                  ? "0 0 0 5px rgba(220,38,38,0.15)"
                  : isSpeaking
                  ? "0 0 0 5px rgba(5,150,105,0.15)"
                  : "0 4px 24px rgba(124,58,237,0.3)",
                opacity: isProcessing ? 0.55 : 1,
                transform: isListening ? "scale(1.07)" : "scale(1)",
              }}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full spin" />
              ) : isSpeaking ? (
                <div className="flex items-end gap-0.5 h-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full wave-bar bg-white"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              ) : isListening ? (
                <div className="flex items-end gap-0.5 h-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full wave-bar bg-white"
                      style={{ animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                </svg>
              )}
            </button>
          </div>

          {/* Text input */}
          <div className="flex w-full gap-2">
            <input
              type="text"
              placeholder="Ou digite aqui..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              disabled={isBusy}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                outline: "none",
              }}
            />
            <button
              onClick={handleTextSubmit}
              disabled={isBusy || !textInput.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: textInput.trim() && !isBusy ? "var(--accent)" : "var(--bg)",
                border: "1px solid var(--border)",
                color: textInput.trim() && !isBusy ? "white" : "var(--muted)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg)" }}>

        {/* Toolbar */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            {lastResponse?.type === "site" ? (
              <>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#FF5F56" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#27C93F" }} />
                </div>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 max-w-xs truncate"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: deployUrl ? "var(--text)" : "var(--muted)",
                  }}
                >
                  {deployUrl ? deployUrl : "preview local — clique em Publicar"}
                </div>
              </>
            ) : (
              <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>Preview</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lastResponse?.type === "site" && (
              deployUrl ? (
                <a
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "var(--success)" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                  Abrir site
                </a>
              ) : (
                <button
                  onClick={handleDeploy}
                  disabled={deploying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                  style={{ background: deploying ? "var(--muted)" : "var(--accent)" }}
                >
                  {deploying ? (
                    <><div className="w-3 h-3 border border-white border-t-transparent rounded-full spin" />Publicando...</>
                  ) : (
                    <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>Publicar</>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* Site links banner */}
        {lastResponse?.type === "site" && lastResponse.slug && (
          <div className="px-5 py-3 flex flex-wrap items-center gap-3" style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0" }}>
            <span className="text-xs font-semibold" style={{ color: "#065f46" }}>✓ Site salvo!</span>
            <a href={`/${lastResponse.slug}`} target="_blank" rel="noopener"
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "#059669", color: "white", textDecoration: "none" }}>
              Ver site público
            </a>
            <a href={`/${lastResponse.slug}/admin`} target="_blank" rel="noopener"
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "var(--accent)", color: "white", textDecoration: "none" }}>
              Painel admin
            </a>
            <span className="text-xs px-3 py-1 rounded-lg" style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }}>
              🔑 Senha: <strong>{lastResponse.admin_senha}</strong>
            </span>
          </div>
        )}

        {/* Preview area */}
        <div className="flex-1 overflow-hidden">
          {lastResponse?.type === "site" && lastResponse.html ? (
            <iframe
              srcDoc={lastResponse.html}
              className="w-full h-full border-0"
              sandbox="allow-scripts"
              title="Preview do site"
            />
          ) : lastResponse?.type === "proposal" ? (
            <div className="flex items-center justify-center h-full p-8">
              <div
                className="w-full max-w-md rounded-2xl overflow-hidden fade-in"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
              >
                <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Proposta comercial</span>
                  </div>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <h3 className="font-semibold text-base" style={{ color: "var(--text)" }}>{lastResponse.title}</h3>
                  {lastResponse.items && (
                    <ul className="flex flex-col gap-2">
                      {lastResponse.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--muted)" }}>
                          <span style={{ color: "var(--accent)" }} className="mt-0.5 flex-shrink-0">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "var(--bg)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>Prazo</p>
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{lastResponse.deadline}</p>
                    </div>
                    <div className="flex-1 rounded-xl p-3 text-center" style={{ background: "var(--bg)" }}>
                      <p className="text-xs mb-1" style={{ color: "var(--muted)" }}>Valor</p>
                      <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{lastResponse.price}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const text = `*${lastResponse.title}*\n\n${lastResponse.items?.map((i) => `• ${i}`).join("\n")}\n\nPrazo: ${lastResponse.deadline}\nValor: ${lastResponse.price}`;
                      navigator.clipboard.writeText(text);
                    }}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                    style={{ background: "var(--accent)" }}
                  >
                    Copiar para WhatsApp
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border)" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Nenhum site ainda</p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--muted)" }}>
                  Fale ou escreva no painel ao lado<br />e o preview aparece aqui.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
