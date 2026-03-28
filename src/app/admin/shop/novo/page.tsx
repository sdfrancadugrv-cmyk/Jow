"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BG = "#070B18"; const GOLD = "#D4A017"; const GOLD_LIGHT = "#FFE082";
const LABEL = "#A08030"; const MUTED = "#7A6018";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(212,160,23,0.25)",
  background: "rgba(212,160,23,0.05)", color: GOLD_LIGHT, fontSize: 13,
  outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { color: LABEL, fontSize: 11, letterSpacing: "0.1em", marginBottom: 6, display: "block" };

export default function NovoProdutoShopPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "", descricao: "", promptVendas: "",
    fotos: "", videos: "", fotosResultados: "", linkFonte: "",
    custoCompra: "", prazoEntrega: "", precoVenda: "", comissaoPorc: "10",
  });

  function set(key: string, value: string) { setForm(prev => ({ ...prev, [key]: value })); }

  async function salvar() {
    if (!form.nome || !form.descricao || !form.promptVendas || !form.precoVenda) {
      alert("Preencha: nome, descrição, prompt de vendas e preço."); return;
    }
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/shop/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          fotos: form.fotos.split("\n").map(s => s.trim()).filter(Boolean),
          videos: form.videos.split("\n").map(s => s.trim()).filter(Boolean),
          fotosResultados: form.fotosResultados.split("\n").map(s => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.erro) { alert(data.erro); return; }
      router.push("/admin/shop");
    } finally { setSalvando(false); }
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <button onClick={() => router.push("/admin/shop")} style={{ fontSize: 11, color: LABEL, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em", marginBottom: 20 }}>← VOLTAR</button>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.2rem", color: GOLD_LIGHT, letterSpacing: "0.2em", marginBottom: 24 }}>NOVO PRODUTO</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={labelStyle}>NOME DO PRODUTO *</label>
            <input style={inputStyle} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Massageador Elétrico Pro" />
          </div>

          <div>
            <label style={labelStyle}>DESCRIÇÃO COMPLETA * <span style={{ color: MUTED }}>(o que a Jennifer vai usar para tirar dúvidas)</span></label>
            <textarea style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Descreva o produto em detalhes: o que é, para que serve, quem usa, diferenciais, especificações..." />
          </div>

          <div>
            <label style={labelStyle}>COMO A JENNIFER DEVE VENDER * <span style={{ color: MUTED }}>(estratégia de vendas)</span></label>
            <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} value={form.promptVendas} onChange={e => set("promptVendas", e.target.value)} placeholder="Ex: Foque nos benefícios para quem tem dor nas costas. Mencione que é o presente perfeito. Use urgência: estoque limitado. Principal objeção: preço — responda que sai mais barato que uma sessão de massagem..." />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>PREÇO DE VENDA (R$) *</label>
              <input style={inputStyle} type="number" value={form.precoVenda} onChange={e => set("precoVenda", e.target.value)} placeholder="97.90" />
            </div>
            <div>
              <label style={labelStyle}>COMISSÃO DO AFILIADO (%)</label>
              <input style={inputStyle} type="number" value={form.comissaoPorc} onChange={e => set("comissaoPorc", e.target.value)} placeholder="10" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>CUSTO DE COMPRA (R$)</label>
              <input style={inputStyle} type="number" value={form.custoCompra} onChange={e => set("custoCompra", e.target.value)} placeholder="35.00" />
            </div>
            <div>
              <label style={labelStyle}>PRAZO DE ENTREGA</label>
              <input style={inputStyle} value={form.prazoEntrega} onChange={e => set("prazoEntrega", e.target.value)} placeholder="8 a 15 dias úteis" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>LINK DO PRODUTO (ML, Shopee, etc.)</label>
            <input style={inputStyle} value={form.linkFonte} onChange={e => set("linkFonte", e.target.value)} placeholder="https://www.mercadolivre.com.br/..." />
          </div>

          <div>
            <label style={labelStyle}>LINKS DAS FOTOS <span style={{ color: MUTED }}>(um por linha — Google Drive, Imgur, etc.)</span></label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.fotos} onChange={e => set("fotos", e.target.value)} placeholder="https://i.imgur.com/foto1.jpg&#10;https://i.imgur.com/foto2.jpg" />
          </div>

          <div>
            <label style={labelStyle}>LINKS DOS VÍDEOS <span style={{ color: MUTED }}>(YouTube — um por linha)</span></label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.videos} onChange={e => set("videos", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </div>

          <div>
            <label style={labelStyle}>FOTOS DE RESULTADOS <span style={{ color: MUTED }}>(provas sociais — um link por linha, Google Drive ou Imgur)</span></label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.fotosResultados} onChange={e => set("fotosResultados", e.target.value)} placeholder="https://drive.google.com/file/d/..." />
          </div>

          <button onClick={salvar} disabled={salvando} style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none",
            background: salvando ? "rgba(212,160,23,0.3)" : `linear-gradient(135deg, #A07010, ${GOLD})`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem", cursor: salvando ? "default" : "pointer",
            letterSpacing: "0.1em", marginTop: 8,
          }}>
            {salvando ? "SALVANDO..." : "SALVAR PRODUTO"}
          </button>
        </div>
      </div>
    </main>
  );
}
