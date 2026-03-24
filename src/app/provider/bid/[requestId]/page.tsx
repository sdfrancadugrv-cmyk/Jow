"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";

const SERVICE_LABELS: Record<string, string> = {
  faxineira: "Faxina / Diarista",
  pedreiro: "Pedreiro",
  eletricista: "Eletricista",
  encanador: "Encanador",
  pintor: "Pintor",
  outros: "Serviço geral",
};

export default function ProviderBidPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [price, setPrice] = useState("");

  const [info, setInfo] = useState<{
    request: { serviceType: string; scheduledDate: string; description?: string; status: string };
    provider: { name: string };
    requestId: string;
  } | null>(null);

  useEffect(() => {
    if (!token) { setError("Link inválido."); setLoading(false); return; }
    fetch(`/api/services/bid?t=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); } else { setInfo(data); }
        setLoading(false);
      })
      .catch(() => { setError("Erro de conexão."); setLoading(false); });
  }, [token]);

  const submit = useCallback(async () => {
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError("Informe um valor válido."); return;
    }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/services/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, price: Number(price) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao enviar."); setSubmitting(false); return; }
      setDone(true);
    } catch {
      setError("Erro de conexão."); setSubmitting(false);
    }
  }, [token, price]);

  const center: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: "#4A3A08", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 28 }}>
          Enviar Proposta
        </p>

        {loading && <div style={{ ...center }}><p style={{ color: "#6A5010" }}>Carregando pedido...</p></div>}

        {!loading && error && (
          <div style={{ ...center }}>
            <p style={{ color: "#F97316", fontSize: 14 }}>{error}</p>
          </div>
        )}

        {!loading && done && (
          <div style={{ ...center }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</div>
            <p style={{ color: GOLD_LIGHT, fontSize: 16, fontWeight: 700 }}>Proposta enviada!</p>
            <p style={{ color: "#C8CDD8", fontSize: 13 }}>Você será avisado pelo WhatsApp se o cliente escolher você.</p>
          </div>
        )}

        {!loading && !error && !done && info && info.request.status !== "open" && (
          <div style={{ ...center }}>
            <p style={{ color: "#F97316", fontSize: 14 }}>Este pedido já foi encerrado.</p>
          </div>
        )}

        {!loading && !error && !done && info && info.request.status === "open" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Detalhes do pedido */}
            <div style={{ padding: "16px 18px", borderRadius: 16, border: "1px solid rgba(212,160,23,0.2)", background: "rgba(212,160,23,0.05)" }}>
              <p style={{ color: "#6A5010", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Detalhes do pedido</p>
              <p style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                {SERVICE_LABELS[info.request.serviceType] || info.request.serviceType}
              </p>
              <p style={{ color: "#C8CDD8", fontSize: 13 }}>Data: {info.request.scheduledDate}</p>
              {info.request.description && <p style={{ color: "#C8CDD8", fontSize: 13, marginTop: 4 }}>{info.request.description}</p>}
            </div>

            <p style={{ color: "#6A5010", fontSize: 12 }}>Olá, <strong style={{ color: GOLD }}>{info.provider.name}</strong>. Qual valor você cobra por este serviço?</p>

            <div>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="R$ 0,00"
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid rgba(212,160,23,0.35)`, background: "rgba(255,255,255,0.04)", color: GOLD_LIGHT, fontSize: 18, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && <p style={{ color: "#F97316", fontSize: 12, textAlign: "center" }}>{error}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 13, cursor: submitting ? "default" : "pointer", border: "none", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? "Enviando..." : "Enviar proposta"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
