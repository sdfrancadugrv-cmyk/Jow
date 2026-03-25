"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const MUTED = "#7A6018";

// ── Cartão ──────────────────────────────────────────────────────────────────
function CardForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setLoading(true); setError("");
    const card = elements.getElement(CardElement);
    if (!card) { setLoading(false); return; }
    const { error: err, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    if (err) { setError(err.message || "Erro no pagamento"); setLoading(false); return; }
    if (paymentIntent?.status === "succeeded") {
      await fetch("/api/provider/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
      onSuccess();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.4)", background: "rgba(255,255,255,0.06)" }}>
        <CardElement options={{ style: { base: { color: "#FFE082", fontSize: "16px", "::placeholder": { color: "#7A6018" } } } }} />
      </div>
      {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
      <button onClick={handlePay} disabled={loading || !stripe} style={{ padding: "14px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Processando..." : "Pagar R$29,90"}
      </button>
    </div>
  );
}

// ── PIX ─────────────────────────────────────────────────────────────────────
function PixForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const handlePix = useCallback(async () => {
    if (!stripe) return;
    setLoading(true); setError("");
    const { error: err, paymentIntent } = await stripe.confirmPixPayment(clientSecret, {
      payment_method: {},
    });
    if (err) { setError(err.message || "Erro ao gerar PIX"); setLoading(false); return; }
    const pix = paymentIntent?.next_action?.pix_display_qr_code as any;
    if (pix) setPixData({ qrCode: pix.data || "", qrCodeUrl: pix.image_url_png || pix.image_url_svg || "" });
    setLoading(false);
  }, [stripe, clientSecret]);

  const copy = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (!pixData) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      {error && <p style={{ color: "#F97316", fontSize: 13 }}>{error}</p>}
      <button onClick={handlePix} disabled={loading} style={{ padding: "14px 32px", borderRadius: 24, background: "#32D583", color: "#0A0A0A", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Gerando..." : "Gerar QR Code PIX"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <p style={{ color: TEXT, fontSize: 13 }}>Escaneie ou copie o código PIX</p>
      {pixData.qrCodeUrl && <img src={pixData.qrCodeUrl} alt="QR Code PIX" style={{ width: 200, height: 200, background: "white", borderRadius: 12, padding: 8 }} />}
      <button onClick={copy} style={{ padding: "10px 24px", borderRadius: 20, background: copied ? "#25D366" : "rgba(212,160,23,0.15)", color: copied ? "white" : GOLD_LIGHT, border: `1px solid ${copied ? "#25D366" : "rgba(212,160,23,0.4)"}`, fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
        {copied ? "✓ Copiado!" : "Copiar código PIX"}
      </button>
      <p style={{ color: MUTED, fontSize: 12, textAlign: "center" }}>Seu acesso é liberado assim que o pagamento for confirmado.</p>
    </div>
  );
}

// ── Wrapper Elements ─────────────────────────────────────────────────────────
function PaymentWrapper({ method, clientSecret, onSuccess }: { method: "card" | "pix"; clientSecret: string; onSuccess: () => void }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
      {method === "card"
        ? <CardForm clientSecret={clientSecret} onSuccess={onSuccess} />
        : <PixForm clientSecret={clientSecret} />}
    </Elements>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function ProviderSubscribePage() {
  const router = useRouter();
  const [method, setMethod] = useState<"card" | "pix" | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectMethod = async (m: "card" | "pix") => {
    setLoading(true); setError(""); setMethod(m); setClientSecret("");
    try {
      const res = await fetch("/api/provider/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: m }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao iniciar pagamento"); setMethod(null); setLoading(false); return; }
      setClientSecret(data.clientSecret);
    } catch {
      setError("Erro de conexão"); setMethod(null);
    }
    setLoading(false);
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 28 }}>
          Ative sua conta
        </p>

        <div style={{ padding: "28px 24px", borderRadius: 20, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.06)", marginBottom: 24 }}>
          <p style={{ color: GOLD_LIGHT, fontSize: 36, fontWeight: 700, marginBottom: 4 }}>R$29,90</p>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>acesso por 30 dias</p>

          {!method && (
            <>
              <p style={{ color: TEXT, fontSize: 14, marginBottom: 16 }}>Como você quer pagar?</p>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => selectMethod("pix")} disabled={loading} style={{ flex: 1, padding: "14px 0", borderRadius: 16, background: "#32D583", color: "#0A0A0A", fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none", opacity: loading ? 0.7 : 1 }}>
                  PIX
                </button>
                <button onClick={() => selectMethod("card")} disabled={loading} style={{ flex: 1, padding: "14px 0", borderRadius: 16, background: "rgba(212,160,23,0.15)", color: GOLD_LIGHT, fontWeight: 700, fontSize: 15, cursor: "pointer", border: `1.5px solid ${GOLD}`, opacity: loading ? 0.7 : 1 }}>
                  Cartão
                </button>
              </div>
              {error && <p style={{ color: "#F97316", fontSize: 13, marginTop: 12 }}>{error}</p>}
            </>
          )}

          {method && !clientSecret && <p style={{ color: MUTED, fontSize: 14 }}>Preparando pagamento...</p>}

          {method && clientSecret && (
            <div style={{ textAlign: "left" }}>
              <button onClick={() => { setMethod(null); setClientSecret(""); setError(""); }} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", marginBottom: 16, textDecoration: "underline" }}>
                ← Trocar forma de pagamento
              </button>
              <PaymentWrapper method={method} clientSecret={clientSecret} onSuccess={() => router.push("/provider/dashboard?payment=success")} />
            </div>
          )}
        </div>

        <button onClick={() => router.push("/provider/dashboard")} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          Ver meu perfil sem assinar
        </button>
      </div>
    </main>
  );
}
