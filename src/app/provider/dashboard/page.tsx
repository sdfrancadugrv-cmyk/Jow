"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";

const SERVICE_LABELS: Record<string, string> = {
  faxineira: "Faxina", pedreiro: "Pedreiro", eletricista: "Eletricista",
  encanador: "Encanador", pintor: "Pintor", outros: "Geral",
};

function Stars({ rating }: { rating: number }) {
  return <span style={{ color: GOLD }}>{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>;
}

export default function ProviderDashboardPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/provider/me")
      .then(r => { if (r.status === 401) { router.push("/provider/login"); return null; } return r.json(); })
      .then(data => { if (data) setProvider(data.provider); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#6A5010" }}>Carregando...</p>
    </main>
  );

  if (!provider) return null;

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.4rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            KADOSH
          </h1>
          <a href="/" style={{ fontSize: 10, color: "#3A2C06", letterSpacing: "0.1em", textDecoration: "none" }}>SAIR</a>
        </div>

        {/* Perfil */}
        <div style={{ padding: "20px", borderRadius: 16, border: "1px solid rgba(212,160,23,0.2)", background: "rgba(212,160,23,0.04)", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 17 }}>{provider.name}</p>
              <p style={{ color: "#6A5010", fontSize: 12, marginTop: 2 }}>
                {SERVICE_LABELS[provider.serviceType] || provider.serviceType} · {provider.city}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <Stars rating={provider.rating} />
              <p style={{ color: "#6A5010", fontSize: 11, marginTop: 2 }}>
                {provider.rating.toFixed(1)} · {provider.reviewCount} {provider.reviewCount === 1 ? "avaliação" : "avaliações"}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(212,160,23,0.1)" }}>
            <p style={{ color: "#6A5010", fontSize: 11 }}>
              Status: <span style={{ color: provider.status === "active" ? "#4ADE80" : "#F97316", fontWeight: 700 }}>
                {provider.status === "active" ? "Ativo — recebendo pedidos" : "Inativo"}
              </span>
            </p>
            <p style={{ color: "#3A2C06", fontSize: 11, marginTop: 4 }}>
              WhatsApp cadastrado: {provider.phone}
            </p>
          </div>
        </div>

        {/* Info operacional */}
        <div style={{ padding: "16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.12)", background: "rgba(212,160,23,0.03)", marginBottom: 20 }}>
          <p style={{ color: "#6A5010", fontSize: 12, lineHeight: 1.7 }}>
            Quando um cliente pedir <strong style={{ color: GOLD }}>{SERVICE_LABELS[provider.serviceType] || provider.serviceType}</strong> perto de você, você receberá uma mensagem no WhatsApp <strong style={{ color: GOLD }}>{provider.phone}</strong> com um link para enviar sua proposta de valor.
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "#2A2208" }}>
          Fique com o WhatsApp aberto para não perder pedidos.
        </p>
      </div>
    </main>
  );
}
