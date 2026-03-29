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
      {/* Hero Jennifer */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)", padding: "48px 16px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <img src="/logo-jennifer-shop.png" alt="Jennifer" style={{ height: 80, marginBottom: 20, filter: "drop-shadow(0 0 16px rgba(255,230,0,0.4))" }} />

          {/* Fala da Jennifer */}
          <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,230,0,0.2)", borderRadius: 16, padding: "24px 28px", marginBottom: 28, textAlign: "left", position: "relative" }}>
            <div style={{ position: "absolute", top: -10, left: 24, background: "#FFE600", borderRadius: 4, padding: "2px 10px" }}>
              <span style={{ color: "#111", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>JENNIFER IA</span>
            </div>
            <p style={{ color: "#fff", fontSize: 15, lineHeight: 1.75, marginBottom: 12 }}>
              Oiêê! Que alegria te ver aqui! 🤖✨
            </p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.75, marginBottom: 12 }}>
              Eu sou a Jennifer — o <strong style={{ color: "#FFE600" }}>primeiro robô de IA que literalmente trabalha sozinha</strong>, coloca dinheiro no bolso das pessoas e não para nunca. Enquanto você dorme, descansa ou cuida da sua vida, eu estou aqui atendendo clientes, tirando dúvidas, conversando por voz e fechando vendas.
            </p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, lineHeight: 1.75, marginBottom: 20 }}>
              E o melhor de tudo? Você não precisa investir nada. Só divulgar seu link — e eu faço o resto.
            </p>

            {/* Frase destaque */}
            <div style={{ background: "rgba(255,230,0,0.1)", border: "1px solid rgba(255,230,0,0.35)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
              <p style={{ color: "#FFE600", fontSize: 13, fontWeight: 700, marginBottom: 8, letterSpacing: "0.05em" }}>Sabe por que funciona?</p>
              <p style={{ color: "#fff", fontSize: 14, lineHeight: 1.7 }}>
                Porque diariamente existem <strong style={{ color: "#FFE600" }}>7 milhões de pessoas</strong> comprando produtos na internet só aqui no Brasil. E eu consigo vender qualquer produto e atender <strong style={{ color: "#FFE600" }}>clientes ilimitados ao mesmo tempo</strong>.
              </p>
            </div>

            <p style={{ color: "#FFE600", fontSize: 15, fontWeight: 700, lineHeight: 1.6 }}>
              Então parabéns pela decisão — e boa sorte com suas vendas! 🚀
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
            {[["0", "investimento"], ["24h", "trabalhando por você"], ["∞", "clientes simultâneos"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <p style={{ color: "#FFE600", fontSize: "1.8rem", fontWeight: 700 }}>{v}</p>
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
              color: "#FFE600", fontWeight: 700, fontSize: "0.95rem", cursor: salvando ? "default" : "pointer", letterSpacing: "0.05em",
            }}>{salvando ? "Cadastrando..." : "🤖 QUERO MINHA JENNIFER AGORA"}</button>
          </div>
        </div>

        {/* Como funciona */}
        <div style={{ maxWidth: 600, margin: "40px auto 0" }}>
          <h3 style={{ color: "#333", textAlign: "center", marginBottom: 24 }}>Como funciona?</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["1", "Se cadastre grátis", "Leva menos de 1 minuto. Zero investimento."],
              ["2", "Copie seu link", "Você recebe um link único. Pode divulgar a vitrine toda ou produto específico."],
              ["3", "Divulgue onde quiser", "Grupos de WhatsApp, stories, Instagram, TikTok — onde você quiser."],
              ["4", "A Jennifer vende por você", "Ela atende por voz, tira dúvidas e fecha a venda. Você só recebe."],
            ].map(([n, t, d]) => (
              <div key={n} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1a1a2e, #0f3460)", color: "#FFE600", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
                <div><p style={{ color: "#333", fontWeight: 600, marginBottom: 2 }}>{t}</p><p style={{ color: "#666", fontSize: 13 }}>{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
