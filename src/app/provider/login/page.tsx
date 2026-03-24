"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";

export default function ProviderLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/provider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Credenciais inválidas"); setLoading(false); return; }
      router.push("/provider/dashboard");
    } catch {
      setError("Erro de conexão");
      setLoading(false);
    }
  }, [email, password, router]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    border: `1px solid rgba(212,160,23,0.35)`,
    background: "rgba(255,255,255,0.04)",
    color: GOLD_LIGHT,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: "#4A3A08", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
          Área do Prestador
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#6A5010", marginBottom: 4, display: "block" }}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#6A5010", marginBottom: 4, display: "block" }}>Senha</label>
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" required />
          </div>

          {error && <p style={{ color: "#F97316", fontSize: 12, textAlign: "center" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "12px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1, letterSpacing: "0.05em" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p style={{ textAlign: "center", fontSize: 11, color: "#3A2C06" }}>
            Não tem conta? <a href="/provider/register" style={{ color: GOLD }}>Cadastre-se aqui</a>
          </p>
          <p style={{ textAlign: "center", fontSize: 11, color: "#3A2C06" }}>
            <a href="/" style={{ color: "#4A3A08" }}>← Voltar para o início</a>
          </p>
        </form>
      </div>
    </main>
  );
}
