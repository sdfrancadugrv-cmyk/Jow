"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useJow, unlockJowAudio } from "@/hooks/useJow";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const LABEL = "#A08030";
const MUTED = "#7A6018";
const BORDER = "rgba(212,160,23,0.2)";

function driveImageUrl(link: string): string {
  const match = link.match(/\/d\/([\w-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : link;
}

export default function CriarProdutoPage() {
  const router = useRouter();
  const { speak, transcribe } = useJow();

  const [ativado, setAtivado] = useState(false);
  const [nome, setNome] = useState("");
  const [destaques, setDestaques] = useState("");
  const [imageLinks, setImageLinks] = useState([""]);
  const [videoLinks, setVideoLinks] = useState([""]);
  const [salesLink, setSalesLink] = useState("");
  const [preco, setPreco] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [gravando, setGravando] = useState(false);
  const [gerandoImagem, setGerandoImagem] = useState<number | null>(null);
  const [descImagem, setDescImagem] = useState<string[]>([""]);
  const [campoVoz, setCampoVoz] = useState<"destaques" | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function ativar() {
    unlockJowAudio();
    setAtivado(true);
    await speak("Olá! Vamos criar sua página de vendas. Preencha o nome do produto, depois me fale os pontos que você quer destacar e eu monto tudo.");
  }

  async function iniciarGravacao(campo: "destaques") {
    if (gravando) return;
    setCampoVoz(campo);
    setGravando(true);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const texto = await transcribe(blob);
      if (campo === "destaques") setDestaques(texto);
      setGravando(false);
      setCampoVoz(null);
    };
    rec.start();
    mediaRef.current = rec;
  }

  function pararGravacao() {
    mediaRef.current?.stop();
  }

  function setImageLink(i: number, v: string) {
    setImageLinks(prev => { const n = [...prev]; n[i] = v; return n; });
  }
  function addImageLink() {
    setImageLinks(prev => [...prev, ""]);
    setDescImagem(prev => [...prev, ""]);
  }
  function removeImageLink(i: number) {
    setImageLinks(prev => prev.filter((_, idx) => idx !== i));
    setDescImagem(prev => prev.filter((_, idx) => idx !== i));
  }

  async function gerarImagem(i: number) {
    if (!descImagem[i]?.trim()) { setErro("Descreva a imagem antes de gerar"); return; }
    setGerandoImagem(i); setErro("");
    try {
      const res = await fetch("/api/vendedor/gerar-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: descImagem[i], contexto: nome }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro || "Erro ao gerar imagem"); return; }
      setImageLinks(prev => { const n = [...prev]; n[i] = data.url; return n; });
    } catch {
      setErro("Erro de conexão");
    } finally {
      setGerandoImagem(null);
    }
  }

  function setVideoLink(i: number, v: string) {
    setVideoLinks(prev => { const n = [...prev]; n[i] = v; return n; });
  }
  function addVideoLink() { setVideoLinks(prev => [...prev, ""]); }
  function removeVideoLink(i: number) { setVideoLinks(prev => prev.filter((_, idx) => idx !== i)); }

  async function criar() {
    if (!nome.trim()) { setErro("Digite o nome do produto"); return; }
    if (!destaques.trim()) { setErro("Descreva os destaques do produto"); return; }
    if (!salesLink.trim()) { setErro("Informe o link de compra"); return; }
    if (!preco.trim()) { setErro("Informe o preço"); return; }

    setLoading(true); setErro("");
    await speak("Perfeito! Estou analisando seu produto e montando a estrutura de vendas...");

    try {
      const res = await fetch("/api/vendedor/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          destaques,
          imageLinks: imageLinks.filter(l => l.trim()),
          videoLinks: videoLinks.filter(l => l.trim()),
          salesLink,
          preco,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro || "Erro"); setLoading(false); return; }
      await speak("Pronto! Sua página de vendas está no ar.");
      router.push(`/vendedor/${data.slug}`);
    } catch {
      setErro("Erro de conexão");
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.03)",
    color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  if (!ativado) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", letterSpacing: "0.2em", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
        KADOSH VENDEDOR
      </h1>
      <p style={{ color: MUTED, fontSize: 14 }}>Crie sua página de vendas profissional</p>
      <button onClick={ativar} style={{ padding: "16px 40px", borderRadius: 50, border: "none", background: `linear-gradient(135deg, #A07010, ${GOLD})`, color: "#0A0808", fontWeight: 700, fontSize: 15, cursor: "pointer", letterSpacing: "0.1em" }}>
        COMEÇAR
      </button>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "32px 16px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>

        <button onClick={() => router.back()} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", marginBottom: 28 }}>← VOLTAR</button>

        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", letterSpacing: "0.15em", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 32 }}>
          Criar Página de Vendas
        </h2>

        {/* Nome */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Nome do produto *</label>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Curso de Marketing, Tênis Pro X..." style={{ ...inp, marginBottom: 20 }} />

        {/* Preço */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Preço *</label>
        <input value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex: R$ 197,00" style={{ ...inp, marginBottom: 20 }} />

        {/* Destaques — com voz */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          O que você quer destacar sobre o produto? *
        </label>
        <p style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
          Fale ou escreva: público-alvo, diferenciais, problema que resolve, garantia, etc.
        </p>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <textarea value={destaques} onChange={e => setDestaques(e.target.value)} placeholder="Ex: É para mulheres acima de 40 anos que querem emagrecer sem academia. O método é 100% online, tem garantia de 7 dias e já ajudou mais de 500 alunas..." rows={4} style={{ ...inp, resize: "vertical", paddingRight: 50 }} />
          <button
            onMouseDown={() => iniciarGravacao("destaques")}
            onMouseUp={pararGravacao}
            onTouchStart={() => iniciarGravacao("destaques")}
            onTouchEnd={pararGravacao}
            style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: "50%", border: "none", background: gravando && campoVoz === "destaques" ? "#e74c3c" : `rgba(212,160,23,0.2)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
            title="Segurar para falar"
          >
            🎤
          </button>
        </div>
        <p style={{ color: MUTED, fontSize: 11, marginBottom: 24 }}>Segure 🎤 para falar</p>

        {/* Imagens */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Fotos do produto
        </label>
        <p style={{ color: MUTED, fontSize: 12, marginBottom: 14 }}>
          Cole o link do Google Drive <span style={{ color: GOLD }}>ou</span> descreva e o Kadosh cria a imagem pra você.
        </p>
        {imageLinks.map((link, i) => (
          <div key={i} style={{ marginBottom: 16, padding: "14px", borderRadius: 12, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)" }}>
            {/* Link do Drive */}
            <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>LINK DO GOOGLE DRIVE</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <input value={link} onChange={e => setImageLink(i, e.target.value)} placeholder="https://drive.google.com/..." style={{ ...inp, flex: 1 }} />
              {link.trim() && (
                <img src={driveImageUrl(link)} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
            </div>

            {/* Separador */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ color: MUTED, fontSize: 11 }}>ou deixa o Kadosh criar</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            {/* Geração por IA */}
            <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.1em", marginBottom: 6 }}>DESCREVA A IMAGEM</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={descImagem[i] || ""}
                onChange={e => setDescImagem(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                placeholder="Ex: escritório moderno, produto em fundo branco, pessoa sorrindo..."
                style={{ ...inp, flex: 1 }}
              />
              <button
                onClick={() => gerarImagem(i)}
                disabled={gerandoImagem === i}
                style={{
                  flexShrink: 0, padding: "0 14px", borderRadius: 10, border: "none",
                  background: gerandoImagem === i ? "rgba(212,160,23,0.2)" : `linear-gradient(135deg, #A07010, ${GOLD})`,
                  color: "#0A0808", fontWeight: 700, fontSize: 12, cursor: gerandoImagem === i ? "default" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {gerandoImagem === i ? "⏳ Criando..." : "✨ Gerar"}
              </button>
            </div>

            {imageLinks.length > 1 && (
              <button onClick={() => removeImageLink(i)} style={{ marginTop: 10, background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 12 }}>
                × remover esta foto
              </button>
            )}
          </div>
        ))}
        <button onClick={addImageLink} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, cursor: "pointer", marginBottom: 24, width: "100%" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Adicionar mais uma foto
        </button>

        {/* Vídeos */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Vídeos do YouTube <span style={{ color: MUTED, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
        </label>
        <p style={{ color: MUTED, fontSize: 12, marginBottom: 10 }}>
          Funciona com vídeos normais e YouTube Shorts.
        </p>
        {videoLinks.map((link, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input value={link} onChange={e => setVideoLink(i, e.target.value)} placeholder={`Vídeo ${i + 1} — https://youtube.com/...`} style={{ ...inp, flex: 1 }} />
            {videoLinks.length > 1 && (
              <button onClick={() => removeVideoLink(i)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "none", color: MUTED, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={addVideoLink} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, cursor: "pointer", marginBottom: 24, width: "100%" }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Adicionar mais um vídeo
        </button>

        {/* Link de compra */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Link de compra *</label>
        <input value={salesLink} onChange={e => setSalesLink(e.target.value)} placeholder="https://hotmart.com/... ou seu link de pagamento" style={{ ...inp, marginBottom: 24 }} />

        {erro && <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{erro}</p>}

        <button onClick={criar} disabled={loading} style={{ width: "100%", padding: "18px", borderRadius: 14, border: "none", background: loading ? "rgba(212,160,23,0.2)" : `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`, color: "#0A0808", fontWeight: 700, fontSize: "1rem", fontFamily: "Georgia, serif", letterSpacing: "0.15em", cursor: loading ? "default" : "pointer", boxShadow: loading ? "none" : `0 0 30px rgba(212,160,23,0.4)` }}>
          {loading ? "Kadosh montando sua página..." : "CRIAR PÁGINA DE VENDAS"}
        </button>
      </div>
    </main>
  );
}
