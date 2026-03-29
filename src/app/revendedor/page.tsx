"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const AZUL = "#3483FA"; const VERDE = "#00A650"; const BG = "#F5F5F5";
const CINZA = "#666"; const AMARELO = "#FFE600";

export default function RevendedorPage() {
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "" });
  const [salvando, setSalvando] = useState(false);
  const [afiliado, setAfiliado] = useState<any>(null);
  const [erro, setErro] = useState("");

  // ── Chat Jennifer ─────────────────────────────────────────────────────────
  const [estado, setEstado] = useState<"aguardando" | "ouvindo" | "processando" | "falando">("aguardando");
  const [mensagens, setMensagens] = useState<{ role: string; content: string }[]>([]);
  const [textoAtual, setTextoAtual] = useState("");
  const [chatAberto, setChatAberto] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  const audioQueue = useRef<string[]>([]);
  const tocandoRef = useRef(false);
  const audioAtual = useRef<HTMLAudioElement | null>(null);
  const interrompido = useRef(false);
  const ttsPendentes = useRef(0);
  const mensagensRef = useRef<{ role: string; content: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textoAtualRef = useRef("");
  const ouvirClienteRef = useRef<() => void>(() => {});

  useEffect(() => { mensagensRef.current = mensagens; }, [mensagens]);
  useEffect(() => {
    if (chatEndRef.current) {
      const c = chatEndRef.current.parentElement;
      if (c) c.scrollTop = c.scrollHeight;
    }
  }, [mensagens, textoAtual]);

  const tocarFila = useCallback(() => {
    if (interrompido.current || tocandoRef.current || audioQueue.current.length === 0) return;
    tocandoRef.current = true;
    const b64 = audioQueue.current[0];
    const audio = new Audio(`data:audio/mp3;base64,${b64}`);
    audioAtual.current = audio;
    setEstado("falando");
    audio.onended = () => {
      audioAtual.current = null; tocandoRef.current = false;
      if (interrompido.current) return;
      if (audioQueue.current.length > 0) tocarFila();
      else if (ttsPendentes.current === 0) { setEstado("aguardando"); ouvirClienteRef.current(); }
    };
    audio.onerror = () => { tocandoRef.current = false; tocarFila(); };
    audio.play()
      .then(() => { audioQueue.current.shift(); })
      .catch(() => {
        tocandoRef.current = false;
        const retry = () => {
          document.removeEventListener("click", retry);
          document.removeEventListener("touchstart", retry);
          tocarFila();
        };
        document.addEventListener("click", retry, { once: true });
        document.addEventListener("touchstart", retry, { once: true });
      });
  }, []);

  function pararAudio() {
    interrompido.current = true;
    if (audioAtual.current) { audioAtual.current.pause(); audioAtual.current = null; }
    audioQueue.current = []; tocandoRef.current = false; ttsPendentes.current = 0;
    setEstado("aguardando");
  }

  const enfileirarTTS = useCallback(async (frase: string) => {
    if (interrompido.current || !frase.trim()) return;
    ttsPendentes.current++;
    try {
      const res = await fetch("/api/professor/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: frase }) });
      const data = await res.json();
      if (data.audio && !interrompido.current) { audioQueue.current.push(data.audio); tocarFila(); }
    } catch {} finally {
      ttsPendentes.current--;
      if (ttsPendentes.current === 0 && audioQueue.current.length === 0 && !tocandoRef.current) {
        setEstado("aguardando");
        ouvirClienteRef.current();
      }
    }
  }, [tocarFila]);

  const ouvirCliente = useCallback(() => {
    if (tocandoRef.current || audioQueue.current.length > 0) return;
    setEstado("ouvindo"); interrompido.current = false;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setEstado("aguardando"); return; }
    const rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript.trim(); if (t) enviarMensagem(t); else ouvirClienteRef.current(); };
    rec.onerror = () => setEstado("aguardando");
    rec.start();
  }, []);

  // Mantém a ref sempre atualizada
  ouvirClienteRef.current = ouvirCliente;

  const enviarMensagem = useCallback(async (texto: string) => {
    pararAudio(); interrompido.current = false; setEstado("processando");
    const novas = [...mensagensRef.current, { role: "user", content: texto }];
    setMensagens(novas); mensagensRef.current = novas;

    let buffer = ""; let ultimo = 0; let respostaCompleta = "";
    const regex = /[^.!?…]*[.!?…]+/g;

    try {
      const res = await fetch("/api/revendedor/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: novas }),
      });
      const reader = res.body!.getReader(); const dec = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        const lines = dec.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim(); if (raw === "[DONE]") break;
          try {
            const { text } = JSON.parse(raw);
            buffer += text; respostaCompleta += text;
            textoAtualRef.current = respostaCompleta;
            setTextoAtual(respostaCompleta);
            regex.lastIndex = ultimo;
            let match;
            while ((match = regex.exec(buffer)) !== null) {
              const f = match[0].trim(); if (f.length > 8) enfileirarTTS(f); ultimo = regex.lastIndex;
            }
          } catch {}
        }
      }
      if (buffer.trim().length > 5) enfileirarTTS(buffer.trim());
      const ass = { role: "assistant", content: respostaCompleta };
      setMensagens(p => [...p, ass]); mensagensRef.current = [...novas, ass];
      setTextoAtual("");
    } catch { setEstado("aguardando"); }
  }, [enfileirarTTS]);

  const iniciarChat = useCallback(() => {
    if (iniciado) return;
    setIniciado(true);
    interrompido.current = false;
    const intro = "Oi! Que bom que você chegou até aqui! Sabe por que esse negócio funciona? Porque todos os dias, só aqui no Brasil, 7 milhões de pessoas compram produtos na internet. E eu consigo vender pra qualquer uma delas e atender clientes ilimitados ao mesmo tempo. Você divulga seu link e eu faço o resto. Então, parabéns pela decisão e boa sorte com suas vendas!";
    enfileirarTTS(intro);
    const msg = { role: "assistant", content: intro };
    setMensagens([msg]); mensagensRef.current = [msg];
  }, [iniciado, enfileirarTTS]);

  // Inicia ao carregar
  useEffect(() => { iniciarChat(); }, []);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://jennifer-ai.vercel.app";

  async function cadastrar() {
    if (!form.nome || !form.whatsapp) { setErro("Nome e WhatsApp são obrigatórios."); return; }
    setSalvando(true); setErro("");
    try {
      const res = await fetch("/api/revendedor/cadastro", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.erro) { setErro(data.erro); return; }
      setAfiliado(data.afiliado);
    } finally { setSalvando(false); }
  }

  if (afiliado) return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "Arial, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: "#333", fontSize: "1.3rem", marginBottom: 8 }}>Cadastro aprovado!</h2>
        <p style={{ color: CINZA, fontSize: 14, marginBottom: 24 }}>Olá {afiliado.nome.split(" ")[0]}! Seu link está pronto.</p>
        <div style={{ background: "#f0f7ff", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <p style={{ color: "#333", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>SEU LINK DE AFILIADO:</p>
          <p style={{ color: AZUL, fontSize: 13, wordBreak: "break-all", fontWeight: 600 }}>{appUrl}/shop?ref={afiliado.codigo}</p>
        </div>
        <button onClick={() => navigator.clipboard.writeText(`${appUrl}/shop?ref=${afiliado.codigo}`).then(() => alert("Copiado!"))}
          style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: AZUL, color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginBottom: 10 }}>
          Copiar meu link
        </button>
        <a href={`/revendedor/painel?codigo=${afiliado.codigo}`}
          style={{ display: "block", width: "100%", padding: "14px", borderRadius: 8, border: `2px solid ${VERDE}`, color: VERDE, fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", boxSizing: "border-box" }}>
          Acessar meu painel
        </a>
        <p style={{ color: "#999", fontSize: 12, marginTop: 16 }}>Seu link também foi enviado por WhatsApp ✅</p>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>

      {/* Header Jennifer */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)", padding: "32px 16px 28px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>

          {/* Logo + legenda */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 20 }}>
            <img
              src="/logo-jennifer-shop.png"
              alt="Jennifer"
              className={estado === "falando" || estado === "ouvindo" ? "jennifer-pulse" : ""}
              style={{ height: 64, filter: "drop-shadow(0 0 12px rgba(255,230,0,0.3))" }}
            />
            <div style={{ textAlign: "left" }}>
              <p style={{ color: AMARELO, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 2 }}>JENNIFER IA</p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                {estado === "falando" ? "falando..." : estado === "ouvindo" ? "ouvindo..." : estado === "processando" ? "pensando..." : "online"}
              </p>
            </div>
            <button
              onClick={() => { pararAudio(); interrompido.current = true; setChatAberto(v => !v); }}
              style={{ marginLeft: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 10px", borderRadius: 10, border: "none", background: chatAberto ? "rgba(255,255,255,0.15)" : "rgba(255,230,0,0.15)", cursor: "pointer" }}>
              <span style={{ fontSize: 18 }}>💬</span>
              <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>{chatAberto ? "fechar" : "chat"}</span>
            </button>
          </div>

          {/* Legenda rolando */}
          {(estado === "falando" || estado === "ouvindo" || estado === "processando") && textoAtual && (
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "8px 16px", marginBottom: 16, overflow: "hidden" }}>
              <p className="jennifer-legenda" style={{ color: "#fff", fontSize: 13, lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {textoAtual}
              </p>
            </div>
          )}

          {/* Destaque frase */}
          <div style={{ background: "rgba(255,230,0,0.1)", border: "1px solid rgba(255,230,0,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <p style={{ color: AMARELO, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Sabe por que funciona?</p>
            <p style={{ color: "#fff", fontSize: 14, lineHeight: 1.7 }}>
              Porque diariamente existem <strong style={{ color: AMARELO }}>7 milhões de pessoas</strong> comprando produtos na internet só aqui no Brasil. E a Jennifer consegue vender qualquer produto e atender <strong style={{ color: AMARELO }}>clientes ilimitados ao mesmo tempo</strong>.
            </p>
          </div>

          <p style={{ color: AMARELO, fontSize: 14, fontWeight: 700 }}>Parabéns pela decisão — e boa sorte com suas vendas! 🚀</p>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 20, flexWrap: "wrap" }}>
            {[["0", "investimento"], ["24h", "trabalhando por você"], ["∞", "clientes simultâneos"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <p style={{ color: AMARELO, fontSize: "1.6rem", fontWeight: 700 }}>{v}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div style={{ background: BG, padding: "40px 16px" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: "#333", fontSize: "1.1rem", fontWeight: 700, marginBottom: 6, textAlign: "center" }}>Quero minha Jennifer agora</h2>
          <p style={{ color: "#999", fontSize: 12, textAlign: "center", marginBottom: 20 }}>Gratuito. Sem mensalidade. Sem investimento.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Seu nome completo *"
              style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, color: "#333", background: "#fff" }} />
            <input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp com DDD *"
              style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, color: "#333", background: "#fff" }} />
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="E-mail (opcional)"
              style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, color: "#333", background: "#fff" }} />
            {erro && <p style={{ color: "#c0392b", fontSize: 13 }}>{erro}</p>}
            <button onClick={cadastrar} disabled={salvando} style={{
              padding: "14px", borderRadius: 8, border: "none",
              background: salvando ? "#ccc" : "linear-gradient(135deg, #1a1a2e, #0f3460)",
              color: AMARELO, fontWeight: 700, fontSize: "0.95rem", cursor: salvando ? "default" : "pointer",
            }}>{salvando ? "Cadastrando..." : "🤖 QUERO MINHA JENNIFER AGORA"}</button>
          </div>
        </div>

        {/* Como funciona */}
        <div style={{ maxWidth: 600, margin: "40px auto 0" }}>
          <h3 style={{ color: "#333", textAlign: "center", marginBottom: 24 }}>Como funciona?</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["1", "Se cadastre grátis", "Leva menos de 1 minuto. Zero investimento."],
              ["2", "Copie seu link", "Vitrine completa ou produto específico — você escolhe."],
              ["3", "Divulgue onde quiser", "WhatsApp, Instagram, TikTok, grupos — onde você quiser."],
              ["4", "A Jennifer vende por você", "Ela atende por voz, tira dúvidas e fecha a venda. Você só recebe."],
            ].map(([n, t, d]) => (
              <div key={n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e, #0f3460)", color: AMARELO, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
                <div><p style={{ color: "#333", fontWeight: 600, marginBottom: 2 }}>{t}</p><p style={{ color: CINZA, fontSize: 13 }}>{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat modal flutuante */}
      {chatAberto && (
        <div style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 101,
          width: "min(360px, calc(100vw - 32px))",
          background: "#fff", borderRadius: 12, border: "1px solid #e5e5e5",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden",
        }}>
          <div style={{ background: "linear-gradient(135deg, #1a1a2e, #0f3460)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/logo-jennifer-shop.png" alt="Jennifer" style={{ width: 32, height: 32, objectFit: "contain", background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Jennifer</p>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
                {estado === "ouvindo" ? "ouvindo..." : estado === "falando" ? "falando..." : estado === "processando" ? "pensando..." : "online"}
              </p>
            </div>
            <button onClick={() => { pararAudio(); interrompido.current = true; setChatAberto(false); }}
              style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "5px 10px", cursor: "pointer" }}>
              Encerrar
            </button>
          </div>

          <div style={{ height: 260, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {mensagens.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "8px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
                  background: m.role === "user" ? AZUL : "#f0f0f0",
                  color: m.role === "user" ? "#fff" : "#333",
                }}>{m.content}</div>
              </div>
            ))}
            {textoAtual && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5, background: "#f0f0f0", color: "#333" }}>{textoAtual}</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e5e5", display: "flex", gap: 8 }}>
            <button
              onClick={() => { if (estado === "ouvindo") setEstado("aguardando"); else { interrompido.current = false; ouvirCliente(); } }}
              style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none",
                background: estado === "ouvindo" ? "#e74c3c" : AZUL,
                color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
              {estado === "ouvindo" ? "⏹ Parar" : estado === "falando" ? "🔊 Falando..." : "🎤 Falar"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes jennifer-glow{0%,100%{transform:scale(1);filter:drop-shadow(0 0 0px #FFE600)}50%{transform:scale(1.12);filter:drop-shadow(0 0 10px #FFE600)}}
        .jennifer-pulse{animation:jennifer-glow 0.8s ease-in-out infinite;}
        @keyframes legenda-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .jennifer-legenda{animation:legenda-in 0.3s ease;}
      `}</style>
    </main>
  );
}
