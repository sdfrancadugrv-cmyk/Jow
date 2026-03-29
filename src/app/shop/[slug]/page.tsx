"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

const BG = "#F5F5F5"; const AZUL = "#3483FA"; const AZUL_ESC = "#2968C8";
const VERDE = "#00A650"; const VERDE_ESC = "#008f45"; const CINZA = "#666"; const BORDA = "#E0E0E0";
const AMARELO = "#FFE600";

function gerarVendasFake(seed: string): number {
  // Hash simples do slug para gerar número determinístico
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  // Base entre 357 e 1847, com "quebrado" garantido (nunca termina em 0 ou 5)
  const base = 357 + (h % 1491);
  const ultimo = base % 10;
  // Se termina em 0 ou 5, soma 3
  return (ultimo === 0 || ultimo === 5) ? base + 3 : base;
}

function getVideoEmbedUrl(url: string): string | null {
  // YouTube Shorts
  const shorts = url.match(/\/shorts\/([^&?/]+)/);
  if (shorts) return `https://www.youtube.com/embed/${shorts[1]}`;
  // YouTube normal
  const yt = url.match(/(?:v=|\/embed\/|youtu\.be\/)([^&?/]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Google Drive: /file/d/FILE_ID/
  const driveFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFile) return `https://drive.google.com/file/d/${driveFile[1]}/preview`;
  // Google Drive: ?id=FILE_ID
  const driveId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveId) return `https://drive.google.com/file/d/${driveId[1]}/preview`;
  return null;
}

function convertDriveUrl(url: string): string {
  if (!url) return url;
  // /file/d/FILE_ID/view
  let m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  // ?id=FILE_ID ou &id=FILE_ID
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
  return url;
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
  const [videoTocando, setVideoTocando] = useState(false);
  const videoJaPerguntouRef = useRef(false);
  const [mensagens, setMensagens] = useState<{ role: string; content: string }[]>([]);
  const [textoAtual, setTextoAtual] = useState("");
  const [estado, setEstado] = useState<"aguardando" | "falando" | "ouvindo" | "processando">("aguardando");
  const [iniciado, setIniciado] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [whatsCliente, setWhatsCliente] = useState("");
  const [mostraForm, setMostraForm] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  // Checkout direto
  const [mostraCheckout, setMostraCheckout] = useState(false);
  const [checkoutNome, setCheckoutNome] = useState("");
  const [checkoutTelefone, setCheckoutTelefone] = useState("");
  const [checkoutCep, setCheckoutCep] = useState("");
  const [checkoutRua, setCheckoutRua] = useState("");
  const [checkoutNumero, setCheckoutNumero] = useState("");
  const [checkoutComplemento, setCheckoutComplemento] = useState("");
  const [checkoutBairro, setCheckoutBairro] = useState("");
  const [checkoutCidade, setCheckoutCidade] = useState("");
  const [checkoutEstado, setCheckoutEstado] = useState("");
  const [gerandoPix, setGerandoPix] = useState(false);
  const [pix, setPix] = useState<{ qrCode: string; qrBase64: string; valor: number } | null>(null);
  // Seleção de modalidade (quando produto tem precoComInstalacao)
  const [modalidade, setModalidade] = useState<"" | "semInstalacao" | "comInstalacao">("");
  const [pixCopiado, setPixCopiado] = useState(false);
  // Instalação
  const [mostraInstalacao, setMostraInstalacao] = useState(false);
  const [instNome, setInstNome] = useState("");
  const [instTelefone, setInstTelefone] = useState("");
  const [instCep, setInstCep] = useState("");
  const [instRua, setInstRua] = useState("");
  const [instNumero, setInstNumero] = useState("");
  const [instBairro, setInstBairro] = useState("");
  const [instCidade, setInstCidade] = useState("");
  const [instEstado, setInstEstado] = useState("");
  const [instEnviando, setInstEnviando] = useState(false);
  const [instSucesso, setInstSucesso] = useState(false);
  const [instErro, setInstErro] = useState("");

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
  useEffect(() => {
    if (chatEndRef.current) {
      const container = chatEndRef.current.parentElement;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [mensagens, textoAtual]);

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
    const b64 = audioQueue.current[0]; // peek — não remove antes de confirmar play
    const audio = new Audio(`data:audio/mp3;base64,${b64}`);
    audioAtual.current = audio;
    audio.onended = () => {
      audioAtual.current = null; tocandoRef.current = false;
      if (interrompido.current) return;
      if (audioQueue.current.length > 0) tocarFila();
      else if (ttsPendentes.current === 0 && onFimAudio.current) { onFimAudio.current(); onFimAudio.current = null; }
    };
    audio.onerror = () => { tocandoRef.current = false; tocarFila(); };
    audio.play()
      .then(() => { audioQueue.current.shift(); }) // remove só após play aceito
      .catch(() => {
        tocandoRef.current = false;
        // Browser bloqueou autoplay — aguarda 1ª interação do usuário e tenta de novo
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

  // ── AUTO-APRESENTAÇÃO ao carregar o produto ───────────────────────────────────
  useEffect(() => {
    if (!produto || iniciado) return;
    setIniciado(true);
    interrompido.current = false;
    setEstado("falando");
    const intro = "Oiêê... eu sou a vendedora Jennifer e tô aqui pra tirar tuas dúvidas e te ajudar a finalizar a compra. Você pode conversar comigo como se estivesse falando com uma pessoa. Eu sou capaz de ouvir, compreender, responder perguntas e te apresentar todos os detalhes sobre esse produto. Qualquer coisa é só chamar!";
    enfileirarTTS(intro);
    onFimAudio.current = () => {
      const msgs = [{ role: "assistant", content: intro }];
      setMensagens(msgs); mensagensRef.current = msgs;
      setEstado("aguardando");
      setTimeout(() => { if (!interrompido.current) ouvirCliente(t => enviarMensagem(t)); }, 500);
    };
  }, [produto, iniciado, enfileirarTTS, ouvirCliente, enviarMensagem]);

  // ── DETECÇÃO DE VÍDEO YOUTUBE (postMessage API) ───────────────────────────────
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "onStateChange") {
          if (data.info === 1) {
            // playing → para Jennifer
            pararAudio(); setVideoTocando(true); videoJaPerguntouRef.current = false;
          } else if ((data.info === 2 || data.info === 0) && !videoJaPerguntouRef.current) {
            // paused ou ended → Jennifer pergunta
            videoJaPerguntouRef.current = true;
            setVideoTocando(false);
            setTimeout(() => {
              interrompido.current = false;
              enviarMensagem("O cliente acabou de assistir ao vídeo do produto. Pergunte o que ele achou, se ficou alguma dúvida que você possa esclarecer. Seja breve e natural.");
            }, 1200);
          }
        }
      } catch {}
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pararAudio, enviarMensagem]);

  async function buscarCep(cep: string) {
    const c = cep.replace(/\D/g, "");
    if (c.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await res.json();
      if (!d.erro) {
        setCheckoutRua(d.logradouro || "");
        setCheckoutBairro(d.bairro || "");
        setCheckoutCidade(d.localidade || "");
        setCheckoutEstado(d.uf || "");
      }
    } catch {}
  }

  async function gerarPix() {
    if (!checkoutNome.trim() || !checkoutTelefone.trim() || !checkoutCep.trim() || !checkoutRua.trim() || !checkoutNumero.trim() || !checkoutCidade.trim() || !checkoutEstado.trim()) {
      alert("Preencha todos os campos obrigatórios."); return;
    }
    const enderecoCompleto = `${checkoutRua}, ${checkoutNumero}${checkoutComplemento ? ` ${checkoutComplemento}` : ""} — ${checkoutBairro} — ${checkoutCidade}/${checkoutEstado} — CEP ${checkoutCep}`;
    setGerandoPix(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoSlug: slug,
          nomeCliente: checkoutNome,
          telefoneCliente: checkoutTelefone,
          enderecoCliente: enderecoCompleto,
          refAfiliado: ref,
        }),
      });
      const data = await res.json();
      if (data.erro) { alert(data.erro); return; }
      setPix({ qrCode: data.pixQrCode, qrBase64: data.pixQrCodeBase64, valor: data.valor });
    } finally { setGerandoPix(false); }
  }

  function copiarPix() {
    if (!pix?.qrCode) return;
    navigator.clipboard.writeText(pix.qrCode);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 3000);
  }

  async function buscarCepInst(cep: string) {
    const c = cep.replace(/\D/g, "");
    if (c.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await res.json();
      if (!d.erro) {
        setInstRua(d.logradouro || "");
        setInstBairro(d.bairro || "");
        setInstCidade(d.localidade || "");
        setInstEstado(d.uf || "");
      }
    } catch {}
  }

  async function enviarInstalacao() {
    if (!instNome.trim() || !instTelefone.trim() || !instCidade.trim() || !instEstado.trim()) {
      setInstErro("Preencha nome, telefone e CEP."); return;
    }
    setInstEnviando(true); setInstErro("");
    const endereco = `${instRua}${instNumero ? `, ${instNumero}` : ""}${instBairro ? ` — ${instBairro}` : ""}`;
    try {
      const res = await fetch("/api/shop/instalacao", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoSlug: slug, nome: instNome, telefone: instTelefone, cep: instCep, cidade: instCidade, estado: instEstado, endereco }),
      });
      const data = await res.json();
      if (data.erro) { setInstErro(data.erro); return; }
      setInstSucesso(true);
    } finally { setInstEnviando(false); }
  }

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
    ...produto.videos.map((v: string) => ({ tipo: "video", url: v })),
    ...produto.fotos.map((f: string) => ({ tipo: "foto", url: f })),
  ];

  return (
    <>
      {/* Script MP */}
      <script src="https://sdk.mercadopago.com/js/v2" async />

      <main style={{ minHeight: "100vh", background: BG, fontFamily: "Arial, sans-serif" }}>
        {/* Header estilo ML */}
        <div style={{ background: AMARELO, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo piscando */}
          <img
            src="/logo-jennifer-shop.png"
            alt="Jennifer Shop"
            className={estado === "falando" || estado === "ouvindo" ? "jennifer-pulse" : ""}
            style={{ height: 64, mixBlendMode: "multiply", flexShrink: 0 }}
          />

          {/* Legenda rolando */}
          <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
            {(textoAtual || estado === "falando" || estado === "ouvindo" || estado === "processando") ? (
              <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
                <span
                  key={textoAtual.slice(-30)}
                  className="jennifer-legenda"
                  style={{ display: "inline-block", color: "#333", fontSize: 12, fontStyle: "italic" }}
                >
                  {estado === "processando" && !textoAtual ? "💭 pensando..." : textoAtual || "..."}
                </span>
              </div>
            ) : (
              <span style={{ color: "#555", fontSize: 11 }}>🟢 Jennifer online</span>
            )}
          </div>

          {/* Botão chat pequeno */}
          <button
            onClick={() => { interrompido.current = false; setChatAberto(v => !v); if (!iniciado) iniciarChat(); }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "6px 10px", borderRadius: 10, border: "none",
              background: chatAberto ? "rgba(0,0,0,0.12)" : "rgba(52,131,250,0.15)",
              cursor: "pointer", flexShrink: 0,
            }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <span style={{ fontSize: 9, color: "#333", fontWeight: 700, letterSpacing: "0.03em" }}>
              {chatAberto ? "fechar" : "chat"}
            </span>
          </button>
        </div>

        <div className="shop-main-grid" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>

          {/* Coluna esquerda */}
          <div className="shop-col-left">
            {/* Galeria */}
            <div className="shop-gallery" style={{ background: "#fff", borderRadius: 8, padding: 16, border: `1px solid ${BORDA}` }}>
              {/* Mídia principal */}
              <div style={{ aspectRatio: "1/1", background: "#f5f5f5", borderRadius: 8, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" }}>
                {todasMidias.length === 0 ? (
                  <span style={{ fontSize: 48 }}>🛍️</span>
                ) : todasMidias[fotoAtiva]?.tipo === "foto" ? (
                  <img src={convertDriveUrl(todasMidias[fotoAtiva].url)} alt={produto.nome} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (() => {
                  const rawUrl = getVideoEmbedUrl(todasMidias[fotoAtiva].url) || "";
                  const embedUrl = rawUrl.includes("youtube.com")
                    ? rawUrl + (rawUrl.includes("?") ? "&" : "?") + "enablejsapi=1"
                    : rawUrl;
                  return (
                    <>
                      <iframe width="100%" height="100%" src={embedUrl} frameBorder={0} allowFullScreen allow="autoplay" />
                      {/* Overlay: captura primeiro clique e para Jennifer */}
                      {!videoTocando && (
                        <div
                          onClick={() => { pararAudio(); setVideoTocando(true); videoJaPerguntouRef.current = false; }}
                          style={{ position: "absolute", inset: 0, cursor: "pointer", zIndex: 2 }}
                        />
                      )}
                    </>
                  );
                })()}
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
                      {m.tipo === "foto" ? <img src={convertDriveUrl(m.url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 24 }}>▶</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descrição */}
            <div className="shop-details" style={{ background: "#fff", borderRadius: 8, padding: 20, border: `1px solid ${BORDA}`, marginTop: 12 }}>
              <h2 style={{ color: "#333", fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>Descrição do produto</h2>
              <p style={{ color: CINZA, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{produto.descricao}</p>
              {produto.prazoEntrega && (
                <div style={{ marginTop: 16, padding: "10px 14px", background: "#f0f7ff", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🚚</span>
                  <span style={{ color: "#333", fontSize: 13 }}>Prazo de entrega: <strong>{produto.prazoEntrega}</strong></span>
                </div>
              )}
            </div>

            {/* Resultados / Provas sociais */}
            {produto.fotosResultados?.length > 0 && (
              <div className="shop-provas" style={{ background: "#fff", borderRadius: 8, padding: 20, border: `1px solid ${BORDA}`, marginTop: 12 }}>
                <h2 style={{ color: "#333", fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>Resultados</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                  {produto.fotosResultados.map((url: string, i: number) => (
                    <a key={i} href={convertDriveUrl(url)} target="_blank" rel="noopener noreferrer">
                      <img
                        src={convertDriveUrl(url)}
                        alt={`Resultado ${i + 1}`}
                        style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1px solid ${BORDA}` }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita */}
          <div className="shop-sidebar" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Card do produto */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 20, border: `1px solid ${BORDA}`, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
              <h1 style={{ color: "#333", fontSize: "1.1rem", fontWeight: 400, lineHeight: 1.4, marginBottom: 12 }}>{produto.nome}</h1>
              <p style={{ color: "#e67e00", fontSize: 12, fontWeight: 600, marginBottom: 10 }}>🔥 {gerarVendasFake(produto.slug)} vendidos</p>

              {/* Seleção de modalidade quando há preço com instalação */}
              {produto.precoComInstalacao ? (
                modalidade === "" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 }}>
                    <p style={{ color: "#333", fontSize: 13, fontWeight: 600 }}>Escolha uma opção:</p>
                    {/* Com instalação */}
                    <div onClick={() => setModalidade("comInstalacao")} style={{
                      border: `2px solid ${AZUL}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                      background: "rgba(52,131,250,0.04)", display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <span style={{ fontSize: 28 }}>🔧</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: AZUL, fontWeight: 700, fontSize: 14 }}>Com instalação</p>
                        <p style={{ color: CINZA, fontSize: 11, marginTop: 2 }}>Pelotas e região (RS)</p>
                      </div>
                      <p style={{ color: AZUL, fontWeight: 700, fontSize: "1.2rem" }}>
                        R$ {produto.precoComInstalacao.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    {/* Sem instalação */}
                    <div onClick={() => setModalidade("semInstalacao")} style={{
                      border: `2px solid ${VERDE}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                      background: "rgba(0,166,80,0.04)", display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <span style={{ fontSize: 28 }}>📦</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: VERDE, fontWeight: 700, fontSize: 14 }}>Sem instalação</p>
                        <p style={{ color: CINZA, fontSize: 11, marginTop: 2 }}>Envio pelos Correios</p>
                      </div>
                      <p style={{ color: VERDE, fontWeight: 700, fontSize: "1.2rem" }}>
                        R$ {produto.precoVenda.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{
                      border: `2px solid ${modalidade === "comInstalacao" ? AZUL : VERDE}`,
                      borderRadius: 10, padding: "10px 14px",
                      display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                      background: modalidade === "comInstalacao" ? "rgba(52,131,250,0.06)" : "rgba(0,166,80,0.06)",
                    }}>
                      <span style={{ fontSize: 22 }}>{modalidade === "comInstalacao" ? "🔧" : "📦"}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: modalidade === "comInstalacao" ? AZUL : VERDE, fontWeight: 700, fontSize: 13 }}>
                          {modalidade === "comInstalacao" ? "Com instalação — Pelotas e região" : "Sem instalação — Envio pelos Correios"}
                        </p>
                      </div>
                      <p style={{ color: modalidade === "comInstalacao" ? AZUL : VERDE, fontWeight: 700, fontSize: "1.1rem" }}>
                        R$ {(modalidade === "comInstalacao" ? produto.precoComInstalacao : produto.precoVenda).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <button onClick={() => { setModalidade(""); setMostraCheckout(false); setMostraInstalacao(false); setPix(null); }}
                      style={{ background: "none", border: "none", color: CINZA, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>
                      ← Trocar opção
                    </button>
                  </div>
                )
              ) : (
                <div style={{ fontSize: "2rem", fontWeight: 700, color: VERDE, marginBottom: 12 }}>
                  R$ {produto.precoVenda.toFixed(2).replace(".", ",")}
                </div>
              )}

              {/* INSTALAÇÃO — quando produto só tem instalação OU modalidade comInstalacao selecionada */}
              {(produto.tipoVenda === "instalacao" || modalidade === "comInstalacao") && modalidade !== "semInstalacao" ? (
                instSucesso ? (
                  <div style={{ padding: "16px", background: "#f0fff4", borderRadius: 8, border: `1px solid ${VERDE}`, textAlign: "center" }}>
                    <p style={{ color: VERDE, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>✅ Solicitação enviada!</p>
                    <p style={{ color: CINZA, fontSize: 13 }}>Entraremos em contato pelo WhatsApp para agendar a instalação.</p>
                  </div>
                ) : mostraInstalacao ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ color: "#333", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>📍 Informe seus dados:</p>
                    <p style={{ color: CINZA, fontSize: 11, marginBottom: 4 }}>Atendemos Pelotas e região (RS)</p>
                    <input value={instNome} onChange={e => setInstNome(e.target.value)} placeholder="Nome completo *" className="shop-input" />
                    <input value={instTelefone} onChange={e => setInstTelefone(e.target.value)} placeholder="WhatsApp com DDD *" className="shop-input" />
                    <input value={instCep} onChange={e => { setInstCep(e.target.value); buscarCepInst(e.target.value); }} placeholder="CEP *" className="shop-input" maxLength={9} />
                    <input value={instRua} onChange={e => setInstRua(e.target.value)} placeholder="Rua / Avenida" className="shop-input" />
                    <input value={instNumero} onChange={e => setInstNumero(e.target.value)} placeholder="Número" className="shop-input" />
                    <input value={instBairro} onChange={e => setInstBairro(e.target.value)} placeholder="Bairro" className="shop-input" />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
                      <input value={instCidade} onChange={e => setInstCidade(e.target.value)} placeholder="Cidade *" className="shop-input" />
                      <input value={instEstado} onChange={e => setInstEstado(e.target.value)} placeholder="UF *" className="shop-input" maxLength={2} />
                    </div>
                    {instErro && (
                      <div style={{ padding: "10px 12px", background: "#fff0f0", borderRadius: 6, border: "1px solid #c0392b" }}>
                        <p style={{ color: "#c0392b", fontSize: 12 }}>{instErro}</p>
                      </div>
                    )}
                    <button onClick={enviarInstalacao} disabled={instEnviando}
                      style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: instEnviando ? "#ccc" : AZUL, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: instEnviando ? "default" : "pointer" }}>
                      {instEnviando ? "Enviando..." : "Confirmar Solicitação"}
                    </button>
                    <button onClick={() => { setMostraInstalacao(false); setInstErro(""); }} style={{ background: "none", border: "none", color: CINZA, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setMostraInstalacao(true)}
                    onMouseEnter={e => (e.currentTarget.style.background = AZUL_ESC)}
                    onMouseLeave={e => (e.currentTarget.style.background = AZUL)}
                    style={{ width: "100%", padding: "16px", borderRadius: 8, border: "none", background: AZUL, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", marginBottom: 10, transition: "background 0.2s" }}>
                    🔧 Solicitar Instalação
                  </button>
                )

              ) : produto.precoComInstalacao && modalidade === "" ? null : (
                /* PIX / Compra normal */
                <>
                  {pix ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                      <div style={{ padding: "12px 16px", background: "#f0fff4", borderRadius: 8, border: `1px solid ${VERDE}`, width: "100%", textAlign: "center" }}>
                        <p style={{ color: VERDE, fontWeight: 700, fontSize: 15 }}>✅ PIX gerado com sucesso!</p>
                        <p style={{ color: CINZA, fontSize: 12, marginTop: 4 }}>Valor: <strong style={{ color: "#333" }}>R$ {pix.valor.toFixed(2).replace(".", ",")}</strong></p>
                      </div>
                      {pix.qrBase64 && (
                        <img src={`data:image/png;base64,${pix.qrBase64}`} alt="QR Code PIX" style={{ width: 180, height: 180, borderRadius: 8, border: `1px solid ${BORDA}` }} />
                      )}
                      <button onClick={copiarPix} style={{
                        width: "100%", padding: "14px", borderRadius: 8, border: "none",
                        background: pixCopiado ? VERDE_ESC : VERDE, color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer",
                      }}>
                        {pixCopiado ? "✅ Código copiado!" : "📋 Copiar código PIX"}
                      </button>
                      <p style={{ color: CINZA, fontSize: 11, textAlign: "center" }}>Abra seu banco, escolha Pix → Colar código e confirme o pagamento</p>
                    </div>
                  ) : mostraCheckout ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{ color: "#333", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Preencha seus dados para comprar:</p>
                      <input value={checkoutNome} onChange={e => setCheckoutNome(e.target.value)} placeholder="Nome completo *" className="shop-input" />
                      <input value={checkoutTelefone} onChange={e => setCheckoutTelefone(e.target.value)} placeholder="Telefone com DDD * (ex: 11999999999)" className="shop-input" />
                      <input value={checkoutCep} onChange={e => { setCheckoutCep(e.target.value); buscarCep(e.target.value); }} placeholder="CEP *" className="shop-input" maxLength={9} />
                      <input value={checkoutRua} onChange={e => setCheckoutRua(e.target.value)} placeholder="Rua / Avenida *" className="shop-input" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input value={checkoutNumero} onChange={e => setCheckoutNumero(e.target.value)} placeholder="Número *" className="shop-input" />
                        <input value={checkoutComplemento} onChange={e => setCheckoutComplemento(e.target.value)} placeholder="Complemento" className="shop-input" />
                      </div>
                      <input value={checkoutBairro} onChange={e => setCheckoutBairro(e.target.value)} placeholder="Bairro *" className="shop-input" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8 }}>
                        <input value={checkoutCidade} onChange={e => setCheckoutCidade(e.target.value)} placeholder="Cidade *" className="shop-input" />
                        <input value={checkoutEstado} onChange={e => setCheckoutEstado(e.target.value)} placeholder="UF *" className="shop-input" maxLength={2} />
                      </div>
                      <button onClick={gerarPix} disabled={gerandoPix}
                        onMouseEnter={e => { if (!gerandoPix) e.currentTarget.style.background = VERDE_ESC; }}
                        onMouseLeave={e => { if (!gerandoPix) e.currentTarget.style.background = VERDE; }}
                        style={{ width: "100%", padding: "14px", borderRadius: 8, border: "none", background: VERDE, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: gerandoPix ? "default" : "pointer", transition: "background 0.2s" }}>
                        {gerandoPix ? "Gerando PIX..." : "Gerar PIX e pagar"}
                      </button>
                      <button onClick={() => setMostraCheckout(false)} style={{ background: "none", border: "none", color: CINZA, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setMostraCheckout(true)}
                      onMouseEnter={e => (e.currentTarget.style.background = VERDE_ESC)}
                      onMouseLeave={e => (e.currentTarget.style.background = VERDE)}
                      style={{ width: "100%", padding: "16px", borderRadius: 8, border: "none", background: VERDE, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer", marginBottom: 10, transition: "background 0.2s" }}>
                      Comprar agora e economizar
                    </button>
                  )}
                </>
              )}


              {ref && (
                <p style={{ color: CINZA, fontSize: 11, textAlign: "center", marginTop: 8 }}>
                  🤝 Você chegou via revendedora
                </p>
              )}
            </div>

            {/* Card afiliado destaque */}
            <a href="/revendedor" style={{ textDecoration: "none" }}>
              <div style={{
                borderRadius: 14, padding: "18px 20px", cursor: "pointer",
                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.18)", position: "relative", overflow: "hidden",
              }}>
                {/* Brilho decorativo */}
                <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,230,0,0.08)" }} />
                <div style={{ position: "absolute", bottom: -15, left: 20, width: 60, height: 60, borderRadius: "50%", background: "rgba(52,131,250,0.1)" }} />

                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, position: "relative" }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>🤖</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#FFE600", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 6 }}>AFILIE-SE GRATUITAMENTE</p>
                    <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 }}>
                      Tenha o 1º robô de IA que trabalha por ti todos os dias
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                      Faça um teste de 15 dias e comprove. Ele vende enquanto você dorme, descansa ou trabalha em outra coisa.
                    </p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FFE600", borderRadius: 20, padding: "7px 16px" }}>
                      <span style={{ color: "#111", fontWeight: 700, fontSize: 13 }}>Quero testar agora</span>
                      <span style={{ color: "#111", fontSize: 14 }}>→</span>
                    </div>
                  </div>
                </div>
              </div>
            </a>

          </div>
        </div>

        {/* Chat modal flutuante */}
        {chatAberto && (
          <div style={{
            position: "fixed", bottom: 16, right: 16, zIndex: 101,
            width: "min(380px, calc(100vw - 32px))",
            background: "#fff", borderRadius: 12, border: `1px solid ${BORDA}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)", overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{ background: AZUL, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/logo-jennifer-shop.png" alt="Jennifer" style={{ width: 32, height: 32, objectFit: "contain", mixBlendMode: "multiply", background: "rgba(255,255,255,0.9)", borderRadius: "50%" }} />
              <div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Jennifer</p>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>
                  {estado === "ouvindo" ? "ouvindo..." : estado === "falando" ? "falando..." : estado === "processando" ? "pensando..." : "online"}
                </p>
              </div>
              <button onClick={() => { pararAudio(); interrompido.current = true; setChatAberto(false); }}
                style={{ marginLeft: "auto", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "5px 10px", cursor: "pointer" }}>
                Encerrar
              </button>
            </div>

            {/* Mensagens */}
            <div style={{ height: 260, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {mensagens.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "80%", padding: "8px 12px",
                    borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    background: m.role === "user" ? AZUL : "#f0f0f0",
                    color: m.role === "user" ? "#fff" : "#333", fontSize: 13, lineHeight: 1.5,
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

            {/* Rodapé mic */}
            <div style={{ borderTop: `1px solid ${BORDA}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: estado === "ouvindo" ? AZUL : "#f0f0f0", cursor: "pointer", fontSize: 16, flexShrink: 0,
              }} onClick={() => { pararAudio(); setTimeout(() => ouvirCliente(t => enviarMensagem(t)), 300); }}>
                🎙️
              </div>
              <p style={{ color: CINZA, fontSize: 11 }}>
                {estado === "ouvindo" ? "Ouvindo... fale agora" : estado === "falando" ? "Jennifer está falando" : "Toque no mic ou escreva"}
              </p>
            </div>
          </div>
        )}

      </main>
      <style>{`
  @keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
  @keyframes jennifer-glow{0%,100%{transform:scale(1);filter:drop-shadow(0 0 0px #FFE600)}50%{transform:scale(1.12);filter:drop-shadow(0 0 10px #FFE600)}}
  .jennifer-pulse{animation:jennifer-glow 0.8s ease-in-out infinite;}
  @keyframes legenda-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
  .jennifer-legenda{animation:legenda-in 0.3s ease;}
  .shop-input{width:100%;padding:11px 12px;border-radius:8px;border:1px solid #E0E0E0;font-size:13px;outline:none;color:#333 !important;background:#fff !important;}
  .shop-input::placeholder{color:#999;}

  /* Mobile: galeria → botão comprar → descrição */
  @media (max-width: 768px) {
    .shop-main-grid {
      display: flex !important;
      flex-direction: column;
      padding: 8px !important;
      gap: 10px !important;
    }
    .shop-col-left {
      display: contents !important;
    }
    .shop-gallery { order: 1; }
    .shop-sidebar { order: 2; }
    .shop-details { order: 3; }
    .shop-provas  { order: 4; }
  }
`}</style>
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
