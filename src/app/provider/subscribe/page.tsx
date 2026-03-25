"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getProviderPriceLabel } from "@/lib/service-types";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const MUTED = "#7A6018";

type Phase = "info" | "select" | "pix-email" | "pix-qr" | "card";

export default function ProviderSubscribePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("info");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [pixQr, setPixQr] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [priceLabel, setPriceLabel] = useState("R$29,90");
  const brickMounted = useRef(false);

  // Busca o preço do prestador logado
  useEffect(() => {
    fetch("/api/provider/me")
      .then(r => r.json())
      .then(d => {
        if (d.provider?.serviceType) setPriceLabel(getProviderPriceLabel(d.provider.serviceType));
      })
      .catch(() => {});
  }, []);

  const priceAmount = priceLabel === "R$99,90" ? 99.90 : priceLabel === "R$49,90" ? 49.90 : 29.90;

  // Gera PIX
  const handlePix = async () => {
    if (!email || !email.includes("@")) { setError("Digite um e-mail válido"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/provider/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pix", payerEmail: email }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { setError(data.error || "Erro ao gerar PIX"); setLoading(false); return; }
      setPixQr(data.pixQrBase64 ? `data:image/png;base64,${data.pixQrBase64}` : "");
      setPixCode(data.pixQr || "");
      setPhase("pix-qr");
      setLoading(false);
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  };

  // Inicia MP Brick (cartão)
  useEffect(() => {
    if (phase !== "card" || brickMounted.current) return;
    brickMounted.current = true;
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!;

    const initBrick = async (MercadoPago: any) => {
      const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      await bricks.create("payment", "mp-provider-brick", {
        initialization: { amount: priceAmount },
        customization: {
          paymentMethods: { creditCard: "all", debitCard: "all", maxInstallments: 1 },
          visual: { hideFormTitle: true, style: { theme: "dark" } },
        },
        callbacks: {
          onReady: () => {},
          onError: (e: unknown) => console.error(e),
          onSubmit: ({ formData }: { formData: Record<string, unknown> }) =>
            new Promise<void>((resolve, reject) => {
              fetch("/api/provider/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method: "card", formData }),
              })
                .then(r => r.json())
                .then(d => { if (d.error) reject(new Error(d.error)); else resolve(); })
                .catch(reject);
            }),
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
  }, [phase, priceAmount]);

  const copyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const btn = { width: "100%", padding: "14px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none" } as const;
  const input = { width: "100%", padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.4)", background: "rgba(255,255,255,0.06)", color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box" } as const;

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
          Ative sua conta
        </p>

        {/* ── Info ── */}
        {phase === "info" && (
          <div style={{ padding: "28px 24px", borderRadius: 20, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.06)", marginBottom: 24, textAlign: "left" }}>
            <p style={{ color: GOLD_LIGHT, fontSize: 14, marginBottom: 4, textAlign: "center" }}>Mensalidade conforme sua categoria</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
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
            <p style={{ color: MUTED, fontSize: 12, marginBottom: 20, textAlign: "center" }}>30 dias · cobrado o maior valor das suas categorias · aviso 7 dias antes de vencer</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {["Receba pedidos de clientes próximos", "Notificações direto no seu WhatsApp", "Avaliações e reputação no perfil"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: GOLD, fontSize: 16 }}>✓</span>
                  <span style={{ color: TEXT, fontSize: 13 }}>{item}</span>
                </div>
              ))}
            </div>
            <p style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: 700, textAlign: "center", marginBottom: 16 }}>
              Seu plano: {priceLabel}/mês
            </p>
            <button onClick={() => setPhase("select")} style={btn}>
              Ativar minha conta
            </button>
          </div>
        )}

        {/* ── Escolha PIX ou Cartão ── */}
        {phase === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: TEXT, fontSize: 14, marginBottom: 4 }}>Como deseja pagar?</p>
            <button onClick={() => setPhase("pix-email")} style={btn}>
              ⚡ Pagar com PIX
            </button>
            <button onClick={() => setPhase("card")} style={{ ...btn, background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.4)", color: GOLD_LIGHT }}>
              💳 Pagar com Cartão
            </button>
            <button onClick={() => setPhase("info")} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer" }}>
              ← Voltar
            </button>
          </div>
        )}

        {/* ── E-mail para PIX ── */}
        {phase === "pix-email" && (
          <div style={{ textAlign: "left" }}>
            <p style={{ color: TEXT, fontSize: 14, marginBottom: 12, textAlign: "center" }}>Seu e-mail para gerar o PIX</p>
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePix()} style={input} />
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center", marginTop: 8 }}>{error}</p>}
            <button onClick={handlePix} disabled={loading} style={{ ...btn, marginTop: 12, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Gerando PIX..." : "Gerar QR Code PIX"}
            </button>
            <button onClick={() => setPhase("select")} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", width: "100%", marginTop: 10 }}>
              ← Voltar
            </button>
          </div>
        )}

        {/* ── QR Code PIX ── */}
        {phase === "pix-qr" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#25D366", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>⚡ PIX gerado! Escaneie para pagar</p>
            {pixQr && <img src={pixQr} alt="QR Code PIX" style={{ width: 200, height: 200, margin: "0 auto 16px", display: "block", borderRadius: 12, background: "white", padding: 8 }} />}
            {pixCode && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: TEXT, fontSize: 12, marginBottom: 8 }}>Ou copie o código abaixo:</p>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 11, color: GOLD, wordBreak: "break-all", marginBottom: 8 }}>
                  {pixCode.slice(0, 60)}...
                </div>
                <button onClick={copyPix} style={btn}>
                  {copied ? "✓ Código copiado!" : "Copiar código PIX"}
                </button>
              </div>
            )}
            <div style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 12, padding: "12px 16px" }}>
              <p style={{ color: "#25D366", fontSize: 13, margin: 0 }}>
                Após o pagamento, sua conta será ativada via WhatsApp em até 1 minuto.
              </p>
            </div>
          </div>
        )}

        {/* ── Cartão (MP Brick) ── */}
        {phase === "card" && (
          <div style={{ textAlign: "left" }}>
            <div id="mp-provider-brick" />
            <button onClick={() => { setPhase("select"); brickMounted.current = false; }} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", width: "100%", marginTop: 10, textAlign: "center" }}>
              ← Voltar
            </button>
          </div>
        )}

        <button onClick={() => router.push("/provider/dashboard")} style={{ background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", textDecoration: "underline", marginTop: 20 }}>
          Ver meu perfil sem assinar
        </button>
      </div>
    </main>
  );
}
