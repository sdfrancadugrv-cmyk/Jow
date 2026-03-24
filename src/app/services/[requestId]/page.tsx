"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

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

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: GOLD, fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

interface Bid {
  id: string;
  price: number;
  providerName: string;
  providerRating: number;
  providerReviewCount: number;
  providerCity: string;
}

interface Request {
  serviceType: string;
  scheduledDate: string;
  description?: string;
  status: string;
}

export default function ServiceBidsPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<Request | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchBids = useCallback(async () => {
    try {
      const res = await fetch(`/api/services/bids?requestId=${requestId}`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRequest(data.request);
      setBids(data.bids);
    } catch {
      setError("Erro ao carregar propostas.");
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchBids();
    // Polling a cada 15s para capturar novas propostas
    const interval = setInterval(fetchBids, 15000);
    return () => clearInterval(interval);
  }, [fetchBids]);

  const selectBid = useCallback(async (bidId: string) => {
    setSelecting(bidId);
    try {
      const res = await fetch("/api/services/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidId, requestId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao processar."); setSelecting(null); return; }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Erro de conexão."); setSelecting(null);
    }
  }, [requestId]);

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: "#4A3A08", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 20 }}>
          Propostas recebidas
        </p>

        {request && (
          <div style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.2)", background: "rgba(212,160,23,0.04)", marginBottom: 20 }}>
            <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 15 }}>
              {SERVICE_LABELS[request.serviceType] || request.serviceType}
            </p>
            <p style={{ color: "#C8CDD8", fontSize: 12, marginTop: 2 }}>Data: {request.scheduledDate}</p>
            {request.description && <p style={{ color: "#6A5010", fontSize: 12, marginTop: 2 }}>{request.description}</p>}
          </div>
        )}

        {error && <p style={{ color: "#F97316", fontSize: 12, textAlign: "center", marginBottom: 12 }}>{error}</p>}

        {loading && <p style={{ textAlign: "center", color: "#6A5010", fontSize: 13 }}>Aguardando propostas...</p>}

        {!loading && bids.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ color: "#6A5010", fontSize: 13 }}>Nenhuma proposta ainda.</p>
            <p style={{ color: "#3A2C06", fontSize: 11, marginTop: 8 }}>Os prestadores foram notificados pelo WhatsApp. Esta página atualiza automaticamente.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {bids.map(bid => (
            <div key={bid.id} style={{ padding: "16px 18px", borderRadius: 16, border: "1px solid rgba(212,160,23,0.25)", background: "rgba(212,160,23,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 15 }}>{bid.providerName}</p>
                  <p style={{ color: "#6A5010", fontSize: 11, marginTop: 2 }}>{bid.providerCity}</p>
                </div>
                <p style={{ color: GOLD, fontWeight: 700, fontSize: 18 }}>R$ {bid.price.toFixed(2).replace(".", ",")}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <StarRating rating={bid.providerRating} />
                <span style={{ color: "#6A5010", fontSize: 11 }}>
                  {bid.providerRating.toFixed(1)} · {bid.providerReviewCount} {bid.providerReviewCount === 1 ? "avaliação" : "avaliações"}
                </span>
              </div>
              <button
                onClick={() => selectBid(bid.id)}
                disabled={selecting === bid.id}
                style={{ width: "100%", padding: "10px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 12, cursor: selecting ? "default" : "pointer", border: "none", opacity: selecting === bid.id ? 0.6 : 1, letterSpacing: "0.05em" }}
              >
                {selecting === bid.id ? "Processando..." : "Escolher — R$ 9,90"}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 10, color: "#2A2208", marginTop: 24 }}>
          Após o pagamento de R$9,90 você recebe o WhatsApp do prestador para combinar os detalhes.
        </p>
      </div>
    </main>
  );
}
