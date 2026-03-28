"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const LABEL = "#A08030";
const MUTED = "#7A6018";
const BORDER = "rgba(212,160,23,0.2)";

function driveImageUrl(link: string): string {
  const match = link.match(/\/d\/([\w-]+)/);
  return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : link;
}

export default function EditarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [destaques, setDestaques] = useState("");
  const [salesLink, setSalesLink] = useState("");
  const [imageLinks, setImageLinks] = useState([""]);
  const [videoLinks, setVideoLinks] = useState([""]);

  useEffect(() => {
    fetch(`/api/vendedor/editar/${slug}`)
      .then(r => r.json())
      .then(d => {
        setNome(d.nome || "");
        setPreco(d.preco || "");
        setDestaques(d.destaques || "");
        setSalesLink(d.salesLink || "");
        setImageLinks(d.imageLinks?.length ? d.imageLinks : [""]);
        setVideoLinks(d.videoLinks?.length ? d.videoLinks : [""]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  function setImgLink(i: number, v: string) { setImageLinks(prev => { const n = [...prev]; n[i] = v; return n; }); }
  function addImgLink() { setImageLinks(prev => [...prev, ""]); }
  function removeImgLink(i: number) { setImageLinks(prev => prev.filter((_, idx) => idx !== i)); }

  function setVidLink(i: number, v: string) { setVideoLinks(prev => { const n = [...prev]; n[i] = v; return n; }); }
  function addVidLink() { setVideoLinks(prev => [...prev, ""]); }
  function removeVidLink(i: number) { setVideoLinks(prev => prev.filter((_, idx) => idx !== i)); }

  async function salvar() {
    if (!nome.trim() || !preco.trim() || !salesLink.trim()) { setErro("Nome, preço e link de compra são obrigatórios"); return; }
    setSalvando(true); setErro(""); setOk(false);
    try {
      const res = await fetch(`/api/vendedor/editar/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, preco, destaques, salesLink, imageLinks, videoLinks }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro || "Erro ao salvar"); return; }
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch { setErro("Erro de conexão"); }
    finally { setSalvando(false); }
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.03)",
    color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: GOLD, animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "32px 16px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>

        <button onClick={() => router.push("/app/vendedor")} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", marginBottom: 28 }}>
          ← MINHAS PÁGINAS
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h2 style={{
            fontFamily: "Georgia, serif", fontSize: "1.3rem", letterSpacing: "0.12em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: 0,
          }}>
            Editar página
          </h2>
          <a href={`/vendedor/${slug}`} target="_blank" rel="noopener noreferrer"
            style={{ color: MUTED, fontSize: 11, textDecoration: "none", border: `1px solid ${BORDER}`, padding: "6px 14px", borderRadius: 20 }}
          >
            🔗 Ver página
          </a>
        </div>

        {/* Nome */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Nome do produto *</label>
        <input value={nome} onChange={e => setNome(e.target.value)} style={{ ...inp, marginBottom: 20 }} />

        {/* Preço */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Preço *</label>
        <input value={preco} onChange={e => setPreco(e.target.value)} style={{ ...inp, marginBottom: 20 }} />

        {/* Destaques */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Destaques do produto</label>
        <textarea value={destaques} onChange={e => setDestaques(e.target.value)} rows={4} style={{ ...inp, resize: "vertical", marginBottom: 20 }} />

        {/* Link de compra */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Link de compra *</label>
        <input value={salesLink} onChange={e => setSalesLink(e.target.value)} style={{ ...inp, marginBottom: 24 }} />

        {/* Fotos */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Fotos <span style={{ color: MUTED, textTransform: "none", letterSpacing: 0 }}>(Google Drive)</span>
        </label>
        {imageLinks.map((link, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input value={link} onChange={e => setImgLink(i, e.target.value)} placeholder={`Foto ${i + 1} — link do Google Drive`} style={{ ...inp, flex: 1 }} />
            {link.trim() && (
              <img src={driveImageUrl(link)} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            {imageLinks.length > 1 && (
              <button onClick={() => removeImgLink(i)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={addImgLink} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, cursor: "pointer", marginBottom: 24, width: "100%" }}>
          <span style={{ fontSize: 18 }}>+</span> Adicionar foto
        </button>

        {/* Vídeos */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Vídeos do YouTube <span style={{ color: MUTED, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
        </label>
        {videoLinks.map((link, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
            <input value={link} onChange={e => setVidLink(i, e.target.value)} placeholder={`Vídeo ${i + 1} — https://youtube.com/...`} style={{ ...inp, flex: 1 }} />
            {videoLinks.length > 1 && (
              <button onClick={() => removeVidLink(i)} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={addVidLink} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "8px 14px", color: GOLD, fontSize: 13, cursor: "pointer", marginBottom: 28, width: "100%" }}>
          <span style={{ fontSize: 18 }}>+</span> Adicionar vídeo
        </button>

        {erro && <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{erro}</p>}
        {ok  && <p style={{ color: "#4CAF50", fontSize: 13, marginBottom: 16 }}>✓ Salvo com sucesso!</p>}

        <button
          onClick={salvar} disabled={salvando}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            background: salvando ? "rgba(212,160,23,0.2)" : `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem", fontFamily: "Georgia, serif",
            letterSpacing: "0.15em", cursor: salvando ? "default" : "pointer",
            boxShadow: salvando ? "none" : `0 0 30px rgba(212,160,23,0.4)`,
          }}
        >
          {salvando ? "Salvando…" : "SALVAR ALTERAÇÕES"}
        </button>
      </div>
    </main>
  );
}
