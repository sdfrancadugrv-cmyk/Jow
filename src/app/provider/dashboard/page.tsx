"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_LABELS } from "@/lib/service-types";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const LABEL = "#A08030";
const MUTED = "#7A6018";


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
      .then(data => {
        if (data) {
          if (data.provider?.status !== "active") {
            router.push("/provider/subscribe");
            return;
          }
          setProvider(data.provider);
        }
        setLoading(false);
      })
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
          <a href="/" style={{ fontSize: 11, color: LABEL, letterSpacing: "0.1em", textDecoration: "none" }}>SAIR</a>
        </div>

        {/* Perfil */}
        <div style={{ padding: "20px", borderRadius: 16, border: "1px solid rgba(212,160,23,0.3)", background: "rgba(212,160,23,0.06)", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 18 }}>{provider.name}</p>
              <p style={{ color: LABEL, fontSize: 13, marginTop: 3 }}>
                {SERVICE_LABELS[provider.serviceType] || provider.serviceType} · {provider.city}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <Stars rating={provider.rating} />
              <p style={{ color: TEXT, fontSize: 12, marginTop: 3 }}>
                {provider.rating.toFixed(1)} · {provider.reviewCount} {provider.reviewCount === 1 ? "avaliação" : "avaliações"}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(212,160,23,0.15)" }}>
            <p style={{ color: TEXT, fontSize: 13 }}>
              Status: <span style={{ color: provider.status === "active" ? "#4ADE80" : "#F97316", fontWeight: 700 }}>
                {provider.status === "active" ? "Ativo — recebendo pedidos" : "Inativo"}
              </span>
            </p>
            <p style={{ color: LABEL, fontSize: 12, marginTop: 5 }}>
              WhatsApp cadastrado: <strong style={{ color: GOLD_LIGHT }}>{provider.phone}</strong>
            </p>
          </div>
        </div>

        {/* Info operacional */}
        <div style={{ padding: "16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.2)", background: "rgba(212,160,23,0.04)", marginBottom: 20 }}>
          <p style={{ color: TEXT, fontSize: 13, lineHeight: 1.8 }}>
            Quando um cliente pedir <strong style={{ color: GOLD }}>{SERVICE_LABELS[provider.serviceType] || provider.serviceType}</strong> perto de você, você receberá uma mensagem no WhatsApp <strong style={{ color: GOLD }}>{provider.phone}</strong> com um link para enviar sua proposta de valor.
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: MUTED }}>
          Fique com o WhatsApp aberto para não perder pedidos.
        </p>
      </div>
    </main>
  );
}
