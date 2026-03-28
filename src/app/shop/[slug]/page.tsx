"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

const BG = "#F5F5F5"; const AZUL = "#3483FA"; const AZUL_ESC = "#2968C8";
const VERDE = "#00A650"; const CINZA = "#666"; const BORDA = "#e5e5e5";

function getYouTubeId(url: string) {
  const m = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
  return m ? m[1] : null;
}

function ProdutoShopContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ref = searchParams?.get("ref") || "";
  const slug = params?.slug as string;

  const [produto, setProduto] = useState<any>(null);
  const [fotoAtiva, setFotoAtiva] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chatAberto, setChatAberto] = useState(false);
  const [mensagens, setMensagens] = useState<{ role: string; content: string }[]>([]);
  const [textoAtual, setTextoAtual] = useState("");
  const [estado, setEstado] = useState<"aguardando" | "falando" | "ouvindo" | "processando">("aguardando");
  const [iniciado, setIniciado] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [whatsCliente, setWhatsCliente] = useState("");
  const [mostraForm, setMostraForm] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const audioQueue = useRef<string[]>([]);
  const tocandoRef = useRef(false);
  const audioAtual = useRef<HTMLAudioElement | null>(null);
  const onFimAudio = useRef<(() => void) | null>(null);
  const interrompido = useRef(false);
  const ttsPendentes = useRef(0);
  const mensagensRef = useRef<{ role: string; content: string }[]>([]);
  const textoAtualRef = useRef("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { mensagensRef.current = mensagens; }, [mensagens]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens, textoAtual]);

  useEffect(() => {
    fetch(`/api/shop/produto/${slug}${ref ? `?ref=${ref}` : ""}`)
      .then(r => r.json())
      .then(d => { if (d.produto) setProduto(d.produto); })
      .finally(() => setLoading(false));
  }, [slug, ref]);

  // ── TTS ──────────────────────────────────────────────────────────────────────
  const tocarFila = useCallback(() => {
    if (interrompido.current || tocandoRef.current || audioQueue.current.length === 0) return;
    tocandoRef.current = true;
    const b64 = audioQueue.current.shift()!;
    const audio = new Audio(`data:audio/mp3;base64,${b64}`);
    audioAtual.current = audio;
    audio.onended = () => {
      audioAtual.current = null; tocandoRef.current = false;
      if (interrompido.current) return;
      if (audioQueue.current.length > 0) tocarFila();
      else if (ttsPendentes.current === 0 && onFimAudio.current) { onFimAudio.current(); onFimAudio.current = null; }
    };
    audio.onerror = () => { tocandoRef.current = false; tocarFila(); };
    audio.play().catch(() => { tocandoRef.current = false; tocarFila(); });
  }, []);

  function pararAudio() {
    interrompido.current = true;
    if (audioAtual.current) { audioAtual.current.pause(); audioAtual.current = null; }
    audioQueue.current = []; tocandoRef.current = false; onFimAudio.current = null; ttsPendentes.current = 0;
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
      if (ttsPendentes.current === 0 && audioQueue.current.length === 0 && !tocandoRef.current && onFimAudio.current) {
        onFimAudio.current(); onFimAudio.current = null;
      }
    }
  }, [tocarFila]);

  // ── MIC ──────────────────────────────────────────────────────────────────────
  const ouvirCliente = useCallback((onTexto: (t: string) => void) => {
    if (tocandoRef.current || audioQueue.current.length > 0) return;
    setEstado("ouvindo"); interrompido.current = false;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setEstado("aguardando"); return; }
    const rec = new SR(); rec.lang = "pt-BR"; rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript.trim(); if (t) onTexto(t); else ouvirCliente(onTexto); };
    rec.onerror = () => setEstado("aguardando");
    rec.start();
  }, []);

  // ── ENVIAR ───────────────────────────────────────────────────────────────────
  const enviarMensagem = useCallback(async (texto: string) => {
    pararAudio(); interrompido.current = false; setEstado("processando");
    let base = mensagensRef.current;
    const emFala = textoAtualRef.current.trim();
    if (emFala) {
      const c = [...base, { role: "assistant", content: emFala }];
      setMensagens(c); mensagensRef.current = c; base = c;
    }
    setTextoAtual(""); textoAtualRef.current = "";
    const nova = { role: "user", content: texto };
    const historico = [...base, nova];
    setMensagens(historico); mensagensRef.current = historico;

    let streamCompleto = ""; let buffer = "";
    function verificarFrase(flush = false) {
      const regex = /[^.!?]*[.!?]+(\s|$)/g; let match, ultimo = 0;
      while ((match = regex.exec(buffer)) !== null) { const f = match[0].trim(); if (f.length > 8) enfileirarTTS(f); ultimo = regex.lastIndex; }
      if (ultimo > 0) buffer = buffer.substring(ultimo);
      if (flush && buffer.trim().length > 5) { enfileirarTTS(buffer.trim()); buffer = ""; }
    }

    try {
      setEstado("falando");
      const res = await fetch("/api/shop/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: historico.map(m => ({ role: m.role, content: m.content })), produtoSlug: slug }),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const linha of decoder.decode(value, { stream: true }).split("\n")) {
          if (!linha.startsWith("data: ")) continue;
          const payload = linha.slice(6).trim();
          if (payload === "[DONE]") { verificarFrase(true); break; }
          try { const { text } = JSON.parse(payload); if (text) { streamCompleto += text; buffer += text; textoAtualRef.current = streamCompleto; setTextoAtual(streamCompleto); verificarFrase(); } } catch {}
        }
      }
      const textoFinal = streamCompleto;
      // Detecta se Jennifer pediu nome e WhatsApp
      if (textoFinal.includes("PEDIDO_PRONTO:")) {
        const partes = textoFinal.split("PEDIDO_PRONTO:")[1]?.split(":");
        if (partes?.length >= 2) { setNomeCliente(partes[0]); setWhatsCliente(partes[1]); setMostraForm(true); }
      }
      onFimAudio.current = () => {
        setTextoAtual(""); textoAtualRef.current = "";
        const final = textoFinal.replace(/PEDIDO_PRONTO:[^\s]*/g, "").trim();
        setMensagens(prev => { const n = [...prev, { role: "assistant", content: final }]; mensagensRef.current = n; return n; });
        setTimeout(() => { if (!interrompido.current) ouvirCliente(t => enviarMensagem(t)); }, 1000);
      };
    } catch { setEstado("aguardando"); }
  }, [slug, enfileirarTTS, ouvirCliente]);

  const iniciarChat = useCallback(async () => {
    setIniciado(true); interrompido.current = false; setEstado("processando"); setTextoAtual("");
    const abertura = `O cliente acabou de abrir a página do produto "${produto?.nome}". Cumprimente-o de forma animada e breve, diga que é a Jennifer e que está aqui para ajudar com qualquer dúvida sobre este produto. Seja entusiasmada mas não invasiva.`;
    let streamCompleto = ""; let buffer = "";
    function verificarFrase(flush = false) {
      const regex = /[^.!?]*[.!?]+(\s|$)/g; let match, ultimo = 0;
      while ((match = regex.exec(buffer)) !== null) { const f = match[0].trim(); if (f.length > 8) enfileirarTTS(f); ultimo = regex.lastIndex; }
      if (ultimo > 0) buffer = buffer.substring(ultimo);
      if (flush && buffer.trim().length > 5) { enfileirarTTS(buffer.trim()); buffer = ""; }
    }
    try {
      setEstado("falando");
      const res = await fetch("/api/shop/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: [{ role: "user", content: abertura }], produtoSlug: slug }),
      });
      const reader = res.body!.getReader(); const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const linha of decoder.decode(value, { stream: true }).split("\n")) {
          if (!linha.startsWith("data: ")) continue;
          const payload = linha.slice(6).trim();
          if (payload === "[DONE]") { verificarFrase(true); break; }
          try { const { text } = JSON.parse(payload); if (text) { streamCompleto += text; buffer += text; textoAtualRef.current = streamCompleto; setTextoAtual(streamCompleto); verificarFrase(); } } catch {}
        }
      }
      const textoFinal = streamCompleto;
      onFimAudio.current = () => {
        setTextoAtual(""); textoAtualRef.current = "";
        const msgs = [{ role: "assistant", content: textoFinal }];
        setMensagens(msgs); mensagensRef.current = msgs;
        setTimeout(() => { if (!interrompido.current) ouvirCliente(t => enviarMensagem(t)); }, 1000);
      };
    } catch { setEstado("aguardando"); }
  }, [slug, produto, enfileirarTTS, ouvirCliente, enviarMensagem]);

  async function finalizarCompra() {
    if (!nomeCliente.trim() || !whatsCliente.trim()) { alert("Preencha nome e WhatsApp."); return; }
    setComprando(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoSlug: slug, nomeCliente, whatsappCliente: whatsCliente, refAfiliado: ref }),
      });
      const data = await res.json();
      if (data.erro) { alert(data.erro); return; }
      // Abre checkout Mercado Pago
      if ((window as any).MercadoPago && data.preferenceId) {
        const mpInstance = new (window as any).MercadoPago(process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY, { locale: "pt-BR" });
        mpInstance.checkout({ preference: { id: data.preferenceId }, autoOpen: true });
      } else {
        setSucesso(true);
        setMostraForm(false);
        enviarMensagem("Ótimo! Meu pedido foi registrado.");
      }
    } finally { setComprando(false); }
  }

  if (loading) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: CINZA }}>Carregando...</p></main>;
  if (!produto) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: CINZA }}>Produto não encontrado.</p></main>;

  const todasMidias = [
    ...produto.fotos.map((f: string) => ({ tipo: "foto", url: f })),
    ...produto.videos.map((v: string) => ({ tipo: "video", url: v })),
  ];

  return (
    <>
      {/* Script MP */}
      <script src="https://sdk.mercadopago.com/js/v2" async />

      <main style={{ minHeight: "100vh", background: BG, fontFamily: "Arial, sans-serif" }}>
        {/* Header estilo ML */}
        <div style={{ background: AZUL, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.2rem", letterSpacing: 1 }}>Jennifer Shop</div>
          <div style={{ flex: 1 }} />
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Compra 100% segura</div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>

          {/* Coluna esquerda */}
          <div>
            {/* Galeria */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 16, border: `1px solid ${BORDA}` }}>
              {/* Mídia principal */}
              <div style={{ aspectRatio: "1/1", background: "#f5f5f5", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                {todasMidias.length === 0 ? (
                  <span style={{ fontSize: 48 }}>🛍️</span>
                ) : todasMidias[fotoAtiva]?.tipo === "foto" ? (
                  <img src={todasMidias[fotoAtiva].url} alt={produto.nome} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${getYouTubeId(todasMidias[fotoAtiva].url)}`} frameBorder={0} allowFullScreen />
                )}
              </div>
              {/* Thumbnails */}
              {todasMidias.length > 1 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                  {todasMidias.map((m: any, i: number) => (
                    <div key={i} onClick={() => setFotoAtiva(i)} style={{
                      width: 64, height: 64, flexShrink: 0, borderRadius: 6, overflow: "hidden", cursor: "pointer",
                      border: `2px solid ${i === fotoAtiva ? AZUL : BORDA}`, background: "#f5f5f5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {m.tipo === "foto" ? <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>▶</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descrição */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: `1px solid ${BORDA}`, marginTop: 12 }}>
              <h2 style={{ color: "#333", fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>Descrição do produto</h2>
              <p style={{ color: CINZA, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{produto.descricao}</p>
              {produto.prazoEntrega && (
                <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0f7ff", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🚚</span>
                  <span style={{ color: "#333", fontSize: 13 }}>Prazo de entrega: <strong>{produto.prazoEntrega}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Card do produto */}
            <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: `1px solid ${BORDA}` }}>
              <h1 style={{ color: "#333", fontSize: "1.1rem", fontWeight: 400, lineHeight: 1.4, marginBottom: 16 }}>{produto.nome}</h1>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#333", marginBottom: 4 }}>
                R$ {produto.precoVenda.toFixed(2).replace(".", ",")}
              </div>
              <p style={{ color: VERDE, fontSize: 13, marginBottom: 16 }}>✓ Em estoque</p>

              {sucesso ? (
                <div style={{ padding: 16, background: "#f0fff4", borderRadius: 8, border: `1px solid ${VERDE}`, textAlign: "center" }}>
                  <p style={{ color: VERDE, fontWeight: 700 }}>✅ Pedido registrado!</p>
                  <p style={{ color: CINZA, fontSize: 13, marginTop: 4 }}>Entraremos em contato pelo WhatsApp em breve.</p>
                </div>
              ) : mostraForm ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ color: "#333", fontSize: 13, fontWeight: 600 }}>Confirme seus dados para finalizar:</p>
                  <input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} placeholder="Seu nome completo"
                    style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${BORDA}`, fontSize: 13 }} />
                  <input value={whatsCliente} onChange={e => setWhatsCliente(e.target.value)} placeholder="WhatsApp (com DDD)"
                    style={{ padding: "10px 12px", borderRadius: 6, border: `1px solid ${BORDA}`, fontSize: 13 }} />
                  <button onClick={finalizarCompra} disabled={comprando} style={{
                    padding: "14px", borderRadius: 6, border: "none", background: VERDE, color: "#fff",
                    fontWeight: 700, fontSize: "0.95rem", cursor: comprando ? "default" : "pointer",
                  }}>{comprando ? "Aguarde..." : "FINALIZAR COMPRA"}</button>
                </div>
              ) : (
                <button onClick={() => { setChatAberto(true); if (!iniciado) iniciarChat(); enviarMensagem("Quero comprar!"); }}
                  style={{ width: "100%", padding: "14px", borderRadius: 6, border: "none", background: VERDE, color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", marginBottom: 8 }}>
                  Comprar agora
                </button>
              )}

              {!mostraForm && !sucesso && (
                <button onClick={() => { setChatAberto(true); if (!iniciado) iniciarChat(); }}
                  style={{ width: "100%", padding: "14px", borderRadius: 6, border: `2px solid ${AZUL}`, background: "transparent", color: AZUL, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer" }}>
                  💬 Tirar dúvidas com a Jennifer
                </button>
              )}

              {ref && (
                <p style={{ color: CINZA, fontSize: 11, textAlign: "center", marginTop: 8 }}>
                  🤝 Você chegou via revendedora
                </p>
              )}
            </div>

            {/* Chat da Jennifer */}
            {chatAberto && (
              <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${BORDA}`, overflow: "hidden" }}>
                <div style={{ background: AZUL, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
                  <div>
                    <p style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Jennifer</p>
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
                      {estado === "ouvindo" ? "ouvindo..." : estado === "falando" ? "falando..." : estado === "processando" ? "pensando..." : "online"}
                    </p>
                  </div>
                  <button onClick={() => { pararAudio(); setChatAberto(false); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
                </div>

                <div style={{ height: 220, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {mensagens.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", padding: "8px 12px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                        background: m.role === "user" ? AZUL : "#f0f0f0", color: m.role === "user" ? "#fff" : "#333", fontSize: 13, lineHeight: 1.5,
                      }}>{m.content.replace(/PEDIDO_PRONTO:[^\s]*/g, "").trim()}</div>
                    </div>
                  ))}
                  {textoAtual && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "#f0f0f0", color: "#333", fontSize: 13, lineHeight: 1.5 }}>
                        {textoAtual}<span style={{ opacity: 0.4 }}>|</span>
                      </div>
                    </div>
                  )}
                  {estado === "processando" && !textoAtual && (
                    <div style={{ display: "flex", gap: 4, padding: "8px 12px" }}>
                      {[0,1,2].map(n => <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: CINZA, animation: `pulse 1.2s ${n*0.2}s infinite` }} />)}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ borderTop: `1px solid ${BORDA}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: estado === "ouvindo" ? AZUL : "#f0f0f0", cursor: "pointer", fontSize: 16,
                  }} onClick={() => { pararAudio(); setTimeout(() => ouvirCliente(t => enviarMensagem(t)), 300); }}>
                    🎙️
                  </div>
                  <p style={{ color: CINZA, fontSize: 11, flex: 1 }}>
                    {estado === "ouvindo" ? "Ouvindo... fale agora" : estado === "falando" ? "Jennifer está falando" : "Toque no mic ou escreva"}
                  </p>
                </div>
              </div>
            )}

            {!chatAberto && (
              <button onClick={() => { setChatAberto(true); if (!iniciado) iniciarChat(); }}
                style={{ padding: "12px", borderRadius: 8, border: `1px solid ${BORDA}`, background: "#fff", color: CINZA, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                🤖 <span>Converse com a Jennifer sobre este produto</span>
              </button>
            )}
          </div>
        </div>
      </main>
      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}`}</style>
    </>
  );
}

export default function ProdutoShopPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#666" }}>Carregando...</p></main>}>
      <ProdutoShopContent />
    </Suspense>
  );
}
