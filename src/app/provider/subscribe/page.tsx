"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const MUTED = "#7A6018";

export default function ProviderSubscribePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [pix, setPix] = useState<{ qrCode: string; qrBase64: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/provider/me")
      .then(r => r.json())
      .then(d => { if (d.provider?.email) setEmail(d.provider.email); })
      .catch(() => {});
  }, []);

  async function gerarPix() {
    if (!email) { setErro("Informe seu e-mail"); return; }
    setLoading(true); setErro("");
    try {
      const res = await fetch("/api/provider/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pix", payerEmail: email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setErro(data.error || "Erro ao gerar PIX"); return; }
      setPix({ qrCode: data.pixQr, qrBase64: data.pixQrBase64 });
    } catch { setErro("Erro de conexão"); }
    finally { setLoading(false); }
  }

  function copiar() {
    if (!pix?.qrCode) return;
    navigator.clipboard.writeText(pix.qrCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>
          JENNIFER
        </h1>
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 28 }}>
          Ative sua conta de prestador
        </p>

        <div style={{ padding: "28px 24px", borderRadius: 20, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.06)", marginBottom: 24 }}>
          <p style={{ color: GOLD_LIGHT, fontSize: 36, fontWeight: 700, marginBottom: 4 }}>R$29,90</p>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>acesso por 30 dias</p>

          {!pix ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.4)", background: "rgba(255,255,255,0.06)", color: GOLD_LIGHT, fontSize: 14, outline: "none" }}
              />
              {erro && <p style={{ color: "#F97316", fontSize: 13 }}>{erro}</p>}
              <button
                onClick={gerarPix}
                disabled={loading}
                style={{ padding: "14px 0", borderRadius: 16, background: "#32D583", color: "#0A0A0A", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Gerando PIX..." : "Pagar com PIX"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <p style={{ color: GOLD_LIGHT, fontSize: 13 }}>Escaneie o QR Code ou copie o código PIX</p>
              {pix.qrBase64 && (
                <img
                  src={`data:image/png;base64,${pix.qrBase64}`}
                  alt="QR Code PIX"
                  style={{ width: 200, height: 200, background: "white", borderRadius: 12, padding: 8 }}
                />
              )}
              <button
                onClick={copiar}
                style={{ padding: "10px 24px", borderRadius: 20, background: copiado ? "#25D366" : "rgba(212,160,23,0.15)", color: copiado ? "white" : GOLD_LIGHT, border: `1px solid ${copiado ? "#25D366" : "rgba(212,160,23,0.4)"}`, fontSize: 14, cursor: "pointer", fontWeight: 600 }}
              >
                {copiado ? "✓ Copiado!" : "Copiar código PIX"}
              </button>
              <p style={{ color: MUTED, fontSize: 12 }}>Seu acesso é liberado automaticamente após o pagamento.</p>
            </div>
          )}
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
