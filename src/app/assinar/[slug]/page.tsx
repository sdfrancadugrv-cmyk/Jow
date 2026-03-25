"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { PLANS } from "@/lib/plans";

export default function AssinarPage() {
  const params = useParams();
  const slug = params.slug as string;
  const plan = PLANS[slug];

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"phone" | "payment">("phone");
  const [clientId, setClientId] = useState("");
  const brickMounted = useRef(false);

  const handlePhone = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Digite um número de WhatsApp válido"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/assinar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, slug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao processar"); setLoading(false); return; }
      setClientId(data.clientId);
      setPhase("payment");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  };

  useEffect(() => {
    if (phase !== "payment" || !clientId || brickMounted.current) return;
    brickMounted.current = true;

    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!;
    const amount = plan.priceAmount / 100;
    const capturedSlug = slug;
    const capturedClientId = clientId;

    const initBrick = async (MercadoPago: any) => {
      const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      await bricks.create("payment", "mp-payment-brick", {
        initialization: { amount },
        customization: {
          paymentMethods: {
            bankTransfer: "all",  // PIX
            creditCard: "all",
            debitCard: "all",
            maxInstallments: 1,
          },
          visual: {
            hideFormTitle: true,
            style: { theme: "dark" },
          },
        },
        callbacks: {
          onReady: () => {},
          onError: (err: unknown) => console.error("[MP Brick error]", err),
          onSubmit: ({ formData }: { formData: Record<string, unknown> }) => {
            return new Promise<void>((resolve, reject) => {
              fetch("/api/assinar/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  formData,
                  clientId: capturedClientId,
                  slug: capturedSlug,
                }),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.error) reject(new Error(data.error));
                  else resolve();
                })
                .catch(reject);
            });
          },
        },
      });
    };

    if ((window as any).MercadoPago) {
      initBrick((window as any).MercadoPago);
    } else {
      const script = document.createElement("script");
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.onload = () => initBrick((window as any).MercadoPago);
      document.head.appendChild(script);
    }
  }, [phase, clientId, slug, plan]);

  if (!plan) {
    return (
      <main style={{ minHeight: "100vh", background: "#070B18", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#D4A017" }}>Plano não encontrado.</p>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%)
        `,
      }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 480 }}>

        <h1 style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(2rem, 8vw, 3.5rem)",
          fontWeight: "bold",
          letterSpacing: "0.35em",
          textAlign: "center",
          marginBottom: 4,
          background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 0 20px rgba(212,160,23,0.6))",
        }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: "#7A6010", fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 28 }}>
          — AI ORCHESTRATOR —
        </p>

        {/* Card do plano */}
        <div style={{
          borderRadius: 20,
          border: "1px solid rgba(212,160,23,0.35)",
          background: "rgba(212,160,23,0.06)",
          padding: "20px",
          marginBottom: 24,
        }}>
          <p style={{ color: "#7A6010", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 4 }}>
            {plan.modo}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <p style={{ color: "#FFE082", fontSize: 22, fontWeight: 700, margin: 0 }}>{plan.plano}</p>
            <p style={{ color: "#D4A017", fontSize: 20, fontWeight: 700, margin: 0 }}>{plan.priceLabel}</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {plan.features.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(212,160,23,0.1)" }}>
                  <td style={{ padding: "8px 0", color: "#D4A017", width: 24, fontSize: 13 }}>✓</td>
                  <td style={{ padding: "8px 0", color: "#C8CDD8", fontSize: 13 }}>{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fase 1: WhatsApp */}
        {phase === "phone" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: "#25D366",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                boxShadow: "0 0 16px rgba(37,211,102,0.4)",
              }}>
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <p style={{ color: "#C8CDD8", fontSize: 14, margin: 0 }}>Seu WhatsApp para acessar o Kadosh</p>
            </div>

            <input
              type="tel"
              placeholder="55 11 99999-9999"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handlePhone()}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 50,
                border: "1px solid rgba(212,160,23,0.35)",
                background: "rgba(255,255,255,0.05)", color: "#FFE082",
                fontSize: 16, outline: "none", boxSizing: "border-box",
                textAlign: "center", marginBottom: 12,
              }}
            />

            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center", marginBottom: 10 }}>{error}</p>}

            <button
              onClick={handlePhone}
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 50,
                background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
                color: "#0A0808", fontWeight: 700, fontSize: 15,
                cursor: loading ? "default" : "pointer", border: "none",
                opacity: loading ? 0.7 : 1, boxShadow: "0 0 24px rgba(218,165,32,0.4)",
              }}
            >
              {loading ? "Aguarde..." : "Ir para pagamento"}
            </button>
          </div>
        )}

        {/* Fase 2: MP Payment Brick */}
        {phase === "payment" && (
          <div>
            <p style={{ color: "#C8CDD8", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
              Pague com PIX ou cartão — 100% seguro
            </p>
            <div id="mp-payment-brick" />
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 12, marginTop: 20 }}>
          <a href="/login" style={{ color: "#7A6010" }}>Já tenho conta — fazer login</a>
        </p>
        <p style={{ textAlign: "center", fontSize: 12, marginTop: 4 }}>
          <a href="/" style={{ color: "#3A2C06" }}>← Voltar ao início</a>
        </p>
      </div>
    </main>
  );
}
