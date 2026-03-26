"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const LABEL = "#A08030";
const MUTED = "#7A6018";

export default function CriarProdutoPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function criar() {
    if (!nome.trim() || !descricao.trim()) { setErro("Nome e descrição são obrigatórios"); return; }
    setLoading(true); setErro("");
    try {
      const res = await fetch("/api/vendedor/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, videoUrl: videoUrl || null }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.erro || "Erro ao criar produto"); return; }
      router.push(`/vendedor/${data.slug}`);
    } catch { setErro("Erro de conexão"); }
    finally { setLoading(false); }
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 12,
    border: "1px solid rgba(212,160,23,0.25)", background: "rgba(255,255,255,0.03)",
    color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "32px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        <button onClick={() => router.back()} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", fontSize: 12, letterSpacing: "0.1em", marginBottom: 28 }}>
          ← VOLTAR
        </button>

        <h1 style={{
          fontFamily: "Georgia, serif", fontSize: "1.6rem", letterSpacing: "0.2em",
          background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          marginBottom: 6,
        }}>
          KADOSH VENDEDOR
        </h1>
        <p style={{ color: MUTED, fontSize: 13, marginBottom: 36 }}>
          Cadastre seu produto e o Kadosh monta a estrutura de vendas.
        </p>

        {/* Nome */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Nome do produto
        </label>
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Ex: Curso de Marketing Digital, Tênis Esportivo X..."
          style={{ ...input, marginBottom: 20 }}
        />

        {/* Descrição */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Descreva seu produto
        </label>
        <textarea
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="O que é, para quem é, o que resolve, diferenciais, preço, etc. Quanto mais detalhes, melhor o Kadosh vai vender."
          rows={6}
          style={{ ...input, resize: "vertical", marginBottom: 20 }}
        />

        {/* Vídeo (opcional) */}
        <label style={{ color: LABEL, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Link do vídeo no YouTube <span style={{ color: MUTED, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
        </label>
        <input
          value={videoUrl}
          onChange={e => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          style={{ ...input, marginBottom: 8 }}
        />
        <p style={{ color: MUTED, fontSize: 11, marginBottom: 28 }}>
          O Kadosh vai exibir o vídeo no momento certo da conversa para ajudar a fechar a venda.
        </p>

        {erro && <p style={{ color: "#e74c3c", fontSize: 13, marginBottom: 16 }}>{erro}</p>}

        <button
          onClick={criar}
          disabled={loading}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            background: loading ? "rgba(212,160,23,0.3)" : `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem",
            fontFamily: "Georgia, serif", letterSpacing: "0.15em",
            cursor: loading ? "default" : "pointer",
            boxShadow: loading ? "none" : `0 0 30px rgba(212,160,23,0.4)`,
          }}
        >
          {loading ? "Kadosh analisando produto..." : "CRIAR PÁGINA DE VENDAS"}
        </button>

        {loading && (
          <p style={{ color: MUTED, fontSize: 12, textAlign: "center", marginTop: 12 }}>
            Isso leva alguns segundos — o Kadosh está montando sua estrutura de vendas.
          </p>
        )}
      </div>
    </main>
  );
}
