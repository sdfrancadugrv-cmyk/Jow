"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const MUTED = "#7A6018";

type Phase = "form" | "select" | "pix-email" | "pix-qr" | "card" | "success";

type ProviderInfo = {
  name: string;
  serviceType: string;
  city: string;
  rating: number | null;
  dailyRate: number | null;
};

function HireForm() {
  const { providerId } = useParams<{ providerId: string }>();

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pixQr, setPixQr] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);
  const brickMounted = useRef(false);

  useEffect(() => {
    fetch(`/api/services/provider-info?id=${providerId}`)
      .then(r => r.json())
      .then(d => setProvider(d.provider))
      .catch(() => {});
  }, [providerId]);

  const handleForm = () => {
    if (!name.trim()) { setError("Digite seu nome"); return; }
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Digite um WhatsApp válido"); return; }
    setError("");
    setPhase("select");
  };

  const handlePix = async () => {
    if (!email || !email.includes("@")) { setError("Digite um e-mail válido"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/services/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pix", payerEmail: email, providerId, clientName: name, clientPhone: phone.replace(/\D/g, "") }),
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

  useEffect(() => {
    if (phase !== "card" || brickMounted.current) return;
    brickMounted.current = true;
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!;

    const initBrick = async (MercadoPago: any) => {
      const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      await bricks.create("payment", "mp-hire-brick", {
        initialization: { amount: 9.90 },
        customization: {
          paymentMethods: { creditCard: "all", debitCard: "all", maxInstallments: 1 },
          visual: { hideFormTitle: true, style: { theme: "dark" } },
        },
        callbacks: {
          onReady: () => {},
          onError: (e: unknown) => console.error(e),
          onSubmit: ({ formData }: { formData: Record<string, unknown> }) =>
            new Promise<void>((resolve, reject) => {
              fetch("/api/services/hire", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method: "card", formData, providerId, clientName: name, clientPhone: phone.replace(/\D/g, "") }),
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
  }, [phase, providerId, name, phone]);

  const copyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const stars = (r: number | null) => {
    const n = Math.round(r || 0);
    return "★".repeat(n) + "☆".repeat(5 - n);
  };

  const btn = { width: "100%", padding: "14px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none" } as const;
  const input = { width: "100%", padding: "13px 16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.4)", background: "rgba(255,255,255,0.06)", color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box" } as const;

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 24 }}>
          Contratar Profissional
        </p>

        {/* Card do profissional */}
        {provider && (
          <div style={{ borderRadius: 16, border: "1px solid rgba(212,160,23,0.25)", background: "rgba(212,160,23,0.05)", padding: "14px 16px", marginBottom: 24 }}>
            <p style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{provider.name}</p>
            <p style={{ color: TEXT, fontSize: 13, margin: "0 0 4px" }}>{provider.serviceType?.split(",").join(" · ")}</p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ color: GOLD, fontSize: 13 }}>{stars(provider.rating)}</span>
              {provider.city && <span style={{ color: MUTED, fontSize: 12 }}>{provider.city}</span>}
              {provider.dailyRate && <span style={{ color: GOLD, fontSize: 12, fontWeight: 600 }}>R${provider.dailyRate.toFixed(2).replace(".", ",")} / dia</span>}
            </div>
          </div>
        )}

        {/* Fase: formulário */}
        {phase === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ color: TEXT, fontSize: 13, textAlign: "center" }}>
              Pague <strong style={{ color: GOLD }}>R$9,90</strong> para receber o WhatsApp deste profissional.
            </p>
            <div>
              <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>Seu nome</p>
              <input style={input} value={name} onChange={e => setName(e.target.value)} placeholder="Como devemos te chamar?" />
            </div>
            <div>
              <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>Seu WhatsApp</p>
              <input style={input} type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && handleForm()} placeholder="55 11 99999-9999" />
            </div>
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
            <button onClick={handleForm} style={btn}>Continuar para pagamento</button>
          </div>
        )}

        {/* Fase: escolha PIX ou Cartão */}
        {phase === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: TEXT, fontSize: 14, textAlign: "center", marginBottom: 4 }}>Como deseja pagar <strong style={{ color: GOLD }}>R$9,90</strong>?</p>
            <button onClick={() => setPhase("pix-email")} style={btn}>⚡ Pagar com PIX</button>
            <button onClick={() => setPhase("card")} style={{ ...btn, background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.4)", color: GOLD_LIGHT }}>💳 Pagar com Cartão</button>
            <button onClick={() => setPhase("form")} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer" }}>← Voltar</button>
          </div>
        )}

        {/* Fase: e-mail PIX */}
        {phase === "pix-email" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: TEXT, fontSize: 14, textAlign: "center" }}>Seu e-mail para gerar o PIX</p>
            <input type="email" style={input} placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePix()} />
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
            <button onClick={handlePix} disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>{loading ? "Gerando PIX..." : "Gerar QR Code PIX"}</button>
            <button onClick={() => setPhase("select")} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer" }}>← Voltar</button>
          </div>
        )}

        {/* Fase: QR Code PIX */}
        {phase === "pix-qr" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#25D366", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>⚡ PIX gerado! Escaneie para pagar</p>
            {pixQr && <img src={pixQr} alt="QR Code PIX" style={{ width: 200, height: 200, margin: "0 auto 16px", display: "block", borderRadius: 12, background: "white", padding: 8 }} />}
            {pixCode && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 11, color: GOLD, wordBreak: "break-all", marginBottom: 8 }}>
                  {pixCode.slice(0, 60)}...
                </div>
                <button onClick={copyPix} style={btn}>{copied ? "✓ Código copiado!" : "Copiar código PIX"}</button>
              </div>
            )}
            <div style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 12, padding: "12px 16px" }}>
              <p style={{ color: "#25D366", fontSize: 13, margin: 0 }}>
                Após o pagamento, você receberá o WhatsApp do profissional em até 1 minuto.
              </p>
            </div>
          </div>
        )}

        {/* Fase: Cartão */}
        {phase === "card" && (
          <div>
            <div id="mp-hire-brick" />
            <button onClick={() => { setPhase("select"); brickMounted.current = false; }} style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", width: "100%", marginTop: 10, textAlign: "center" }}>← Voltar</button>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 24 }}>
          <a href="/services/new" style={{ color: MUTED, fontSize: 12 }}>← Ver outros profissionais</a>
        </p>
      </div>
    </main>
  );
}

export default function HirePage() {
  return <Suspense><HireForm /></Suspense>;
}
