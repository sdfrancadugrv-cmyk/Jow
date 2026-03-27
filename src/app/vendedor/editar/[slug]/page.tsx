"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";
const BORDER     = "rgba(212,160,23,0.2)";

function driveImageUrl(link: string): string {
  const match = link.match(/\/d\/([\w-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : link;
}

export default function EditarProdutoPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");
  const [sucesso, setSucesso]       = useState(false);

  const [nome, setNome]             = useState("");
  const [preco, setPreco]           = useState("");
  const [destaques, setDestaques]   = useState("");
  const [salesLink, setSalesLink]   = useState("");
  const [imageLinks, setImageLinks] = useState([""]);
  const [videoLinks, setVideoLinks] = useState([""]);
  const [permitirAfiliados, setPermitirAfiliados] = useState(false);

  useEffect(() => {
    fetch(`/api/vendedor/editar/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.erro) { setErro(d.erro); setCarregando(false); return; }
        setNome(d.nome || "");
        setPreco(d.preco || "");
        setDestaques(d.destaques || "");
        setSalesLink(d.salesLink || "");
        setImageLinks(d.imageLinks?.length ? d.imageLinks : [""]);
        setVideoLinks(d.videoLinks?.length ? d.videoLinks : [""]);
        setPermitirAfiliados(d.permitirAfiliados ?? false);
        setCarregando(false);
      })
      .catch(() => { setErro("Erro ao carregar produto."); setCarregando(false); });
  }, [slug]);

  function setImageLink(i: number, v: string) {
    setImageLinks(prev => { const n = [...prev]; n[i] = v; return n; });
  }
  function setVideoLink(i: number, v: string) {
    setVideoLinks(prev => { const n = [...prev]; n[i] = v; return n; });
  }

  async function salvar() {
    if (!nome.trim()) { setErro("Nome é obrigatório"); return; }
    setSalvando(true); setErro("");
    try {
      const res = await fetch(`/api/vendedor/editar/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, preco, destaques, salesLink,
          imageLinks: imageLinks.filter(l => l.trim()),
          videoLinks: videoLinks.filter(l => l.trim()),
          permitirAfiliados,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro || "Erro ao salvar"); setSalvando(false); return; }
      setSucesso(true);
      setTimeout(() => router.push("/vendedor/minhas-paginas"), 1200);
    } catch {
      setErro("Erro de conexão");
      setSalvando(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.03)",
    color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  if (carregando) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: MUTED, fontSize: 13, letterSpacing: "0.15em" }}>carregando...</p>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "32px 16px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>

        <button onClick={() => router.push("/vendedor/minhas-paginas")} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", marginBottom: 28 }}>
          ← VOLTAR
        </button>

        <h2 style={{
          fontFamily: "Georgia, serif", fontSize: "1.4rem", letterSpacing: "0.15em",
          background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          marginBottom: 32,
        }}>
          Editar Página de Vendas
        </h2>

        {/* Nome */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Nome do produto *</label>
        <input value={nome} onChange={e => setNome(e.target.value)} style={{ ...inp, marginBottom: 20 }} />

        {/* Preço */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Preço</label>
        <input value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex: R$ 197,00" style={{ ...inp, marginBottom: 20 }} />

        {/* Destaques */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Destaques do produto</label>
        <textarea value={destaques} onChange={e => setDestaques(e.target.value)} rows={4} style={{ ...inp, resize: "vertical", marginBottom: 20 }} />

        {/* Imagens */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Fotos (Google Drive)</label>
        {imageLinks.map((link, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input value={link} onChange={e => setImageLink(i, e.target.value)} placeholder={`Foto ${i + 1} — link do Google Drive`} style={{ ...inp, flex: 1 }} />
            {link.trim() && (
              <img src={driveImageUrl(link)} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            {imageLinks.length > 1 && (
              <button onClick={() => setImageLinks(prev => prev.filter((_, idx) => idx !== i))} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={() => setImageLinks(prev => [...prev, ""])} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, cursor: "pointer", marginBottom: 24, width: "100%" }}>
          <span style={{ fontSize: 18 }}>+</span> Adicionar foto
        </button>

        {/* Vídeos */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Vídeos do YouTube</label>
        {videoLinks.map((link, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input value={link} onChange={e => setVideoLink(i, e.target.value)} placeholder={`Vídeo ${i + 1} — https://youtube.com/...`} style={{ ...inp, flex: 1 }} />
            {videoLinks.length > 1 && (
              <button onClick={() => setVideoLinks(prev => prev.filter((_, idx) => idx !== i))} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={() => setVideoLinks(prev => [...prev, ""])} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, cursor: "pointer", marginBottom: 24, width: "100%" }}>
          <span style={{ fontSize: 18 }}>+</span> Adicionar vídeo
        </button>

        {/* Link de compra */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Link de compra</label>
        <input value={salesLink} onChange={e => setSalesLink(e.target.value)} placeholder="https://hotmart.com/..." style={{ ...inp, marginBottom: 28 }} />

        {/* Toggle afiliados */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 12, border: `1px solid ${permitirAfiliados ? "rgba(212,160,23,0.4)" : BORDER}`, background: permitirAfiliados ? "rgba(212,160,23,0.06)" : "rgba(255,255,255,0.02)", marginBottom: 28, cursor: "pointer" }} onClick={() => setPermitirAfiliados(v => !v)}>
          <div>
            <p style={{ margin: 0, color: permitirAfiliados ? GOLD : LABEL, fontWeight: 700, fontSize: 13 }}>🤝 Permitir Revendedores</p>
            <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 11, lineHeight: 1.5 }}>
              {permitirAfiliados ? "Ativo — botão de revenda aparece nesta página" : "Inativo — nenhum botão de revenda nesta página"}
            </p>
          </div>
          <div style={{ width: 44, height: 24, borderRadius: 12, background: permitirAfiliados ? GOLD : "rgba(255,255,255,0.08)", border: `1px solid ${permitirAfiliados ? GOLD : BORDER}`, position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 2, left: permitirAfiliados ? 22 : 2, width: 18, height: 18, borderRadius: "50%", background: permitirAfiliados ? "#060606" : MUTED, transition: "left 0.2s" }} />
          </div>
        </div>

        {erro    && <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{erro}</p>}
        {sucesso && <p style={{ color: "#25D366", fontSize: 13, marginBottom: 16 }}>Salvo! Redirecionando...</p>}

        <button
          onClick={salvar}
          disabled={salvando || sucesso}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            background: salvando ? "rgba(212,160,23,0.2)" : `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem",
            fontFamily: "Georgia, serif", letterSpacing: "0.15em",
            cursor: salvando ? "default" : "pointer",
            boxShadow: salvando ? "none" : `0 0 30px rgba(212,160,23,0.4)`,
          }}
        >
          {salvando ? "Salvando..." : "SALVAR ALTERAÇÕES"}
        </button>

      </div>
    </main>
  );
}
