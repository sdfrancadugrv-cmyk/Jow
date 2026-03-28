"use client";
import { useState } from "react";

const AZUL = "#3483FA"; const VERDE = "#00A650"; const BG = "#F5F5F5";

export default function RevendedorPage() {
  const [form, setForm] = useState({ nome: "", whatsapp: "", email: "" });
  const [salvando, setSalvando] = useState(false);
  const [afiliado, setAfiliado] = useState<any>(null);
  const [erro, setErro] = useState("");

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

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://jennifer-ai.vercel.app";

  if (afiliado) return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "Arial, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 480, width: "100%", background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: "#333", fontSize: "1.3rem", marginBottom: 8 }}>Cadastro aprovado!</h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Olá {afiliado.nome}! Seu link de revendedora está pronto.</p>

        <div style={{ background: "#f0f7ff", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <p style={{ color: "#333", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>SEU LINK DE AFILIADA:</p>
          <p style={{ color: AZUL, fontSize: 13, wordBreak: "break-all", fontWeight: 600 }}>{appUrl}/shop?ref={afiliado.codigo}</p>
        </div>

        <button onClick={() => { const url = `${appUrl}/shop?ref=${afiliado.codigo}`; navigator.clipboard.writeText(url).then(() => alert("Link copiado!")); }}
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
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)", padding: "60px 16px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <p style={{ color: "#FFE082", fontSize: 13, letterSpacing: "0.2em", marginBottom: 12 }}>JENNIFER SHOP</p>
          <h1 style={{ color: "#fff", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 700, lineHeight: 1.3, marginBottom: 16 }}>
            Ganhe dinheiro sem trabalhar.<br />A Jennifer vende por você.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            Divulgue seu link. Quando alguém comprar, você recebe a comissão <strong style={{ color: "#FFE082" }}>na hora</strong>.<br />
            A Jennifer faz toda a venda por voz, 24h por dia.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 40, flexWrap: "wrap" }}>
            {[["0", "trabalho de vendas"], ["24h", "Jennifer vendendo"], ["100%", "automático"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <p style={{ color: "#FFE082", fontSize: "1.8rem", fontWeight: 700 }}>{v}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div style={{ background: BG, padding: "40px 16px" }}>
        <div style={{ maxWidth: 440, margin: "0 auto", background: "#fff", borderRadius: 12, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h2 style={{ color: "#333", fontSize: "1.1rem", fontWeight: 700, marginBottom: 20, textAlign: "center" }}>Quero ser revendedora</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Seu nome completo *"
              style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }} />
            <input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp com DDD *"
              style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }} />
            <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="E-mail (opcional)"
              style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14 }} />
            {erro && <p style={{ color: "#c0392b", fontSize: 13 }}>{erro}</p>}
            <button onClick={cadastrar} disabled={salvando} style={{
              padding: "14px", borderRadius: 8, border: "none", background: salvando ? "#ccc" : AZUL,
              color: "#fff", fontWeight: 700, fontSize: "0.95rem", cursor: salvando ? "default" : "pointer",
            }}>{salvando ? "Cadastrando..." : "COMEÇAR A GANHAR AGORA"}</button>
          </div>

          <p style={{ color: "#999", fontSize: 11, textAlign: "center", marginTop: 12 }}>Gratuito. Sem mensalidade. Sem investimento.</p>
        </div>

        {/* Como funciona */}
        <div style={{ maxWidth: 600, margin: "40px auto 0" }}>
          <h3 style={{ color: "#333", textAlign: "center", marginBottom: 24 }}>Como funciona?</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["1", "Se cadastre", "É grátis e leva menos de 1 minuto."],
              ["2", "Copie seu link", "Você recebe um link único de afiliada."],
              ["3", "Divulgue", "Compartilhe nos grupos, stories, WhatsApp — onde quiser."],
              ["4", "Receba", "Quando alguém comprar pelo seu link, a comissão cai na hora no seu saldo."],
            ].map(([n, t, d]) => (
              <div key={n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: AZUL, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
                <div><p style={{ color: "#333", fontWeight: 600, marginBottom: 2 }}>{t}</p><p style={{ color: "#666", fontSize: 13 }}>{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
