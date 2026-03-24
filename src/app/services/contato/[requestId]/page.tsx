"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";

export default function ServiceContatoPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const searchParams = useSearchParams();
  const bidId = searchParams.get("bid") || "";
  const sessionId = searchParams.get("session") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [providerPhone, setProviderPhone] = useState("");
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    if (!bidId || !sessionId) { setError("Link inválido."); setLoading(false); return; }

    // Confirma pagamento e libera contato
    fetch("/api/services/confirm-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId, requestId, sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); } else {
          setProviderPhone(data.providerPhone);
          setProviderName(data.providerName);
        }
        setLoading(false);
      })
      .catch(() => { setError("Erro de conexão."); setLoading(false); });
  }, [bidId, requestId, sessionId]);

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ color: "#4A3A08", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
          Contato Desbloqueado
        </p>

        {loading && <p style={{ color: "#6A5010" }}>Confirmando pagamento...</p>}

        {!loading && error && <p style={{ color: "#F97316", fontSize: 14 }}>{error}</p>}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
              ✓
            </div>
            <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 18 }}>{providerName}</p>
            <div style={{ padding: "16px 24px", borderRadius: 16, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.06)" }}>
              <p style={{ color: "#6A5010", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>WhatsApp</p>
              <p style={{ color: GOLD_LIGHT, fontSize: 22, fontWeight: 700, letterSpacing: "0.05em" }}>{providerPhone}</p>
            </div>
            <a
              href={`https://wa.me/${providerPhone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding: "12px 32px", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 13, textDecoration: "none", display: "inline-block" }}
            >
              Abrir WhatsApp
            </a>
            <p style={{ color: "#2A2208", fontSize: 11 }}>Lembre-se de avaliar o prestador após o serviço.</p>
          </div>
        )}
      </div>
    </main>
  );
}
