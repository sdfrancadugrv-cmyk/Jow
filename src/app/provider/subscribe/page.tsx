"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const MUTED = "#7A6018";

export default function ProviderSubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"info" | "payment">("info");
  const [preferenceId, setPreferenceId] = useState("");
  const [priceLabel, setPriceLabel] = useState("R$29,90");
  const brickMounted = useRef(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/provider/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      if (data.preferenceId) {
        const cents = data.priceAmount as number;
        setPriceLabel(cents === 9990 ? "R$99,90" : cents === 4990 ? "R$49,90" : "R$29,90");
        setPreferenceId(data.preferenceId);
        setPhase("payment");
      }
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phase !== "payment" || !preferenceId || brickMounted.current) return;
    brickMounted.current = true;

    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!;

    const initBrick = async (MercadoPago: any) => {
      const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      await bricks.create("payment", "mp-provider-brick", {
        initialization: {
          amount: priceLabel === "R$99,90" ? 99.90 : priceLabel === "R$49,90" ? 49.90 : 29.90,
          preferenceId,
        },
        customization: {
          paymentMethods: { bankTransfer: "all", creditCard: "all", debitCard: "all", maxInstallments: 1 },
          visual: { hideFormTitle: true, style: { theme: "dark" } },
        },
        callbacks: {
          onReady: () => {},
          onError: (e: unknown) => console.error(e),
          onSubmit: () => Promise.resolve(),
        },
      });
    };

    if ((window as any).MercadoPago) initBrick((window as any).MercadoPago);
    else {
      const s = document.createElement("script");
      s.src = "https://sdk.mercadopago.com/js/v2";
      s.onload = () => initBrick((window as any).MercadoPago);
      document.head.appendChild(s);
    }
  }, [phase, preferenceId, priceLabel]);

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
          Ative sua conta
        </p>

        {phase === "info" && (
          <div style={{ padding: "28px 24px", borderRadius: 20, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.06)", marginBottom: 24 }}>
            <p style={{ color: GOLD_LIGHT, fontSize: 14, marginBottom: 4 }}>Mensalidade conforme sua categoria</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, textAlign: "left" }}>
              {[
                ["R$29,90/mês", "Pedreiro, eletricista, faxineira, etc."],
                ["R$49,90/mês", "Advogados, fisioterapeuta, personal..."],
                ["R$99,90/mês", "Médicos, psicólogos, adv. criminal..."],
              ].map(([price, desc]) => (
                <div key={price} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: GOLD, fontSize: 14, minWidth: 80, fontWeight: 700 }}>{price}</span>
                  <span style={{ color: TEXT, fontSize: 13 }}>{desc}</span>
                </div>
              ))}
            </div>
            <p style={{ color: MUTED, fontSize: 12, marginBottom: 20 }}>30 dias · cobrado o maior valor das suas categorias · aviso 7 dias antes de vencer</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, textAlign: "left" }}>
              {[
                "Receba pedidos de clientes próximos",
                "Notificações direto no seu WhatsApp",
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
              style={{ width: "100%", padding: "14px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 15, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Aguarde..." : "Ativar minha conta"}
            </button>
          </div>
        )}

        {phase === "payment" && (
          <div style={{ textAlign: "left" }}>
            <p style={{ color: TEXT, fontSize: 13, textAlign: "center", marginBottom: 16 }}>
              Pague com PIX ou cartão — {priceLabel}/mês
            </p>
            <div id="mp-provider-brick" />
          </div>
        )}

        <button onClick={() => router.push("/provider/dashboard")} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          Ver meu perfil sem assinar
        </button>
      </div>
    </main>
  );
}
