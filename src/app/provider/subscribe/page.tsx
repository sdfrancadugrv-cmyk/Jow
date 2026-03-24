"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const MUTED = "#7A6018";

export default function ProviderSubscribePage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/provider/checkout", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
          Ative sua conta
        </p>

        <div style={{ padding: "28px 24px", borderRadius: 20, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.06)", marginBottom: 24 }}>
          <p style={{ color: GOLD_LIGHT, fontSize: 36, fontWeight: 700, marginBottom: 4 }}>R$29,90</p>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 4 }}>por 30 dias · cartão ou PIX</p>
          <p style={{ color: MUTED, fontSize: 11, marginBottom: 24 }}>você recebe aviso 7 dias antes de vencer</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, textAlign: "left" }}>
            {[
              "Receba pedidos de clientes próximos a você",
              "Notificações direto no seu WhatsApp",
              "Envie propostas de valor",
              "Avaliações e reputação no perfil",
            ].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: GOLD, fontSize: 16 }}>✓</span>
                <span style={{ color: TEXT, fontSize: 13 }}>{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 24,
              background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`,
              color: "#0A0808", fontWeight: 700, fontSize: 15,
              cursor: loading ? "default" : "pointer", border: "none",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Redirecionando..." : "Ativar por R$29,90/mês"}
          </button>
        </div>

        <button
          onClick={() => router.push("/provider/dashboard")}
          style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
        >
          Ver meu perfil sem assinar
        </button>
      </div>
    </main>
  );
}
