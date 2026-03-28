"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const BG = "#070B18"; const GOLD = "#D4A017"; const GOLD_LIGHT = "#FFE082";
const LABEL = "#A08030"; const MUTED = "#7A6018";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(212,160,23,0.25)",
  background: "rgba(212,160,23,0.05)", color: GOLD_LIGHT, fontSize: 13,
  outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { color: LABEL, fontSize: 11, letterSpacing: "0.1em", marginBottom: 6, display: "block" };

export default function EditarProdutoShopPage() {
  const router = useRouter();
  const params = useParams();
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({
    nome: "", descricao: "", promptVendas: "", fotos: "", videos: "",
    linkFonte: "", custoCompra: "", prazoEntrega: "", precoVenda: "", comissaoPorc: "10",
  });

  useEffect(() => {
    fetch("/api/admin/shop/produtos")
      .then(r => r.json())
      .then(d => {
        const p = (d.produtos || []).find((x: any) => x.id === params.id);
        if (p) setForm({
          nome: p.nome, descricao: p.descricao, promptVendas: p.promptVendas,
          fotos: (p.fotos || []).join("\n"), videos: (p.videos || []).join("\n"),
          linkFonte: p.linkFonte, custoCompra: p.custoCompra, prazoEntrega: p.prazoEntrega,
          precoVenda: p.precoVenda, comissaoPorc: p.comissaoPorc,
        });
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  function set(key: string, value: string) { setForm((prev: any) => ({ ...prev, [key]: value })); }

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/shop/produtos/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fotos: form.fotos.split("\n").map((s: string) => s.trim()).filter(Boolean),
          videos: form.videos.split("\n").map((s: string) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.erro) { alert(data.erro); return; }
      router.push("/admin/shop");
    } finally { setSalvando(false); }
  }

  if (loading) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: MUTED }}>carregando...</p></main>;

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <button onClick={() => router.push("/admin/shop")} style={{ fontSize: 11, color: LABEL, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em", marginBottom: 20 }}>← VOLTAR</button>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", color: GOLD_LIGHT, letterSpacing: "0.2em", marginBottom: 24 }}>EDITAR PRODUTO</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div><label style={labelStyle}>NOME *</label><input style={inputStyle} value={form.nome} onChange={e => set("nome", e.target.value)} /></div>
          <div><label style={labelStyle}>DESCRIÇÃO *</label><textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={form.descricao} onChange={e => set("descricao", e.target.value)} /></div>
          <div><label style={labelStyle}>COMO JENNIFER DEVE VENDER *</label><textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={form.promptVendas} onChange={e => set("promptVendas", e.target.value)} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={labelStyle}>PREÇO (R$) *</label><input style={inputStyle} type="number" value={form.precoVenda} onChange={e => set("precoVenda", e.target.value)} /></div>
            <div><label style={labelStyle}>COMISSÃO (%)</label><input style={inputStyle} type="number" value={form.comissaoPorc} onChange={e => set("comissaoPorc", e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={labelStyle}>CUSTO (R$)</label><input style={inputStyle} type="number" value={form.custoCompra} onChange={e => set("custoCompra", e.target.value)} /></div>
            <div><label style={labelStyle}>PRAZO ENTREGA</label><input style={inputStyle} value={form.prazoEntrega} onChange={e => set("prazoEntrega", e.target.value)} /></div>
          </div>
          <div><label style={labelStyle}>LINK FONTE</label><input style={inputStyle} value={form.linkFonte} onChange={e => set("linkFonte", e.target.value)} /></div>
          <div><label style={labelStyle}>FOTOS (um por linha)</label><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.fotos} onChange={e => set("fotos", e.target.value)} /></div>
          <div><label style={labelStyle}>VÍDEOS (um por linha)</label><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.videos} onChange={e => set("videos", e.target.value)} /></div>
          <button onClick={salvar} disabled={salvando} style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none",
            background: salvando ? "rgba(212,160,23,0.3)" : `linear-gradient(135deg, #A07010, ${GOLD})`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem", cursor: salvando ? "default" : "pointer", letterSpacing: "0.1em", marginTop: 8,
          }}>{salvando ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}</button>
        </div>
      </div>
    </main>
  );
}
