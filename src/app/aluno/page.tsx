"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const TEXT       = "#D8C890";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";

const PLANOS: Record<string, { nome: string; modo: string }> = {
  "professor-start":  { nome: "Professor Start",  modo: "Kadosh Professor" },
  "professor-pro":    { nome: "Professor Pro",    modo: "Kadosh Professor" },
  "professor-scale":  { nome: "Professor Scale",  modo: "Kadosh Professor" },
  "vendedor-starter": { nome: "Vendedor Starter", modo: "Kadosh Vendedor"  },
  "vendedor-pro":     { nome: "Vendedor Pro",     modo: "Kadosh Vendedor"  },
  "vendedor-scale":   { nome: "Vendedor Scale",   modo: "Kadosh Vendedor"  },
  "secretaria-pro":   { nome: "Secretária Pro",   modo: "Kadosh Secretária"},
  "secretaria-scale": { nome: "Secretária Scale", modo: "Kadosh Secretária"},
  "expert":           { nome: "Expert",           modo: "Kadosh Expert"    },
};

export default function AlunoPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data.status !== "active") { router.push("/login"); return; }
        setClient(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: GOLD, fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}>carregando...</p>
    </main>
  );

  if (!client) return null;

  const plano = PLANOS[client.plan] || { nome: client.plan, modo: "Kadosh" };
  const primeiroNome = client.name?.split(" ")[0] || "Aluno";

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "Georgia, serif",
            fontSize: "1.5rem",
            letterSpacing: "0.25em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            KADOSH
          </h1>
          <button onClick={sair} style={{ fontSize: 11, color: LABEL, letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}>
            SAIR
          </button>
        </div>

        {/* Saudação */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: GOLD_LIGHT, fontFamily: "Georgia, serif", fontSize: "1.3rem", fontWeight: 700 }}>
            Olá, {primeiroNome}.
          </p>
          <p style={{ color: LABEL, fontSize: 13, marginTop: 4 }}>
            Bem-vindo ao seu painel {plano.modo}.
          </p>
        </div>

        {/* Card do plano */}
        <div style={{ padding: "20px", borderRadius: 16, border: "1px solid rgba(212,160,23,0.3)", background: "rgba(212,160,23,0.06)", marginBottom: 24 }}>
          <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>seu plano</p>
          <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 18, fontFamily: "Georgia, serif" }}>{plano.nome}</p>
          <p style={{ color: TEXT, fontSize: 13, marginTop: 4 }}>{plano.modo}</p>
          {client.planExpiresAt && (
            <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>
              Acesso até: {new Date(client.planExpiresAt).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

        {/* Botão principal */}
        <button
          onClick={() => router.push(`/aluno/${client.plan}`)}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem",
            fontFamily: "Georgia, serif", letterSpacing: "0.15em", cursor: "pointer",
            boxShadow: `0 0 30px rgba(212,160,23,0.4)`, marginBottom: 16,
          }}
        >
          INICIAR {plano.modo.toUpperCase()}
        </button>

        {/* Renovar */}
        <button
          onClick={() => router.push(`/assinar/${client.plan}`)}
          style={{
            width: "100%", padding: "14px", borderRadius: 14,
            border: "1px solid rgba(212,160,23,0.25)", background: "transparent",
            color: LABEL, fontSize: "0.85rem", fontFamily: "Georgia, serif",
            letterSpacing: "0.1em", cursor: "pointer",
          }}
        >
          renovar plano
        </button>

      </div>
    </main>
  );
}
