"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { PLANS } from "@/lib/plans";

type Phase = "phone" | "select" | "pix-email" | "pix-qr" | "card" | "success";

function AssinarForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const plan = PLANS[slug];
  const isVoice = searchParams.get("voice") === "1";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>("phone");
  const [clientId, setClientId] = useState("");
  const [pixQr, setPixQr] = useState("");
  const [pixCode, setPixCode] = useState("");
  const [copied, setCopied] = useState(false);
  const brickMounted = useRef(false);

  // Voz do Kadosh ao chegar na página de pagamento
  useEffect(() => {
    if (!isVoice) return;
    fetch("/api/landing-speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Agora só preciso que você preencha seus dados conforme está pedindo e escolha a forma de pagamento.",
      }),
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(() => {});
      })
      .catch(() => {});
  }, [isVoice]);

  // Fase 1: Registra/busca cliente
  const handlePhone = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Digite um número de WhatsApp válido"); return; }
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    if (password !== confirmPassword) { setError("As senhas não coincidem"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/assinar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, slug, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao processar"); setLoading(false); return; }
      setClientId(data.clientId);
      setPhase("select");
      setLoading(false);
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  };

  // Fase PIX: gera o QR code
  const handlePix = async () => {
    if (!email || !email.includes("@")) { setError("Digite um e-mail válido"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/assinar/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "pix", payerEmail: email, clientId, slug }),
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

  // Fase Cartão: inicia MP Brick
  useEffect(() => {
    if (phase !== "card" || brickMounted.current) return;
    brickMounted.current = true;
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY!;
    const capturedClientId = clientId;

    const initBrick = async (MercadoPago: any) => {
      const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
      const bricks = mp.bricks();
      await bricks.create("payment", "mp-card-brick", {
        initialization: { amount: plan.priceAmount / 100 },
        customization: {
          paymentMethods: { creditCard: "all", debitCard: "all", maxInstallments: 1 },
          visual: { hideFormTitle: true, style: { theme: "dark" } },
        },
        callbacks: {
          onReady: () => {},
          onError: (err: unknown) => console.error("[MP Brick]", err),
          onSubmit: ({ formData }: { formData: Record<string, unknown> }) =>
            new Promise<void>((resolve, reject) => {
              fetch("/api/assinar/payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ method: "card", formData, clientId: capturedClientId, slug }),
              })
                .then((r) => r.json())
                .then((d) => { if (d.error) reject(new Error(d.error)); else resolve(); })
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
  }, [phase, clientId, slug, plan]);

  const copyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (!plan) return (
    <main style={{ minHeight: "100vh", background: "#070B18", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#D4A017" }}>Plano não encontrado.</p>
    </main>
  );

  const gold = { background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };
  const btn = { width: "100%", padding: "14px 0", borderRadius: 50, background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)", color: "#0A0808", fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none", boxShadow: "0 0 24px rgba(218,165,32,0.4)" } as const;
  const input = { width: "100%", padding: "13px 16px", borderRadius: 50, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(255,255,255,0.05)", color: "#FFE082", fontSize: 16, outline: "none", boxSizing: "border-box", textAlign: "center", marginBottom: 12 } as const;

  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px 16px",
      background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%), radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%)` }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 480 }}>

        {/* Header */}
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2rem, 8vw, 3.5rem)", fontWeight: "bold", letterSpacing: "0.35em", textAlign: "center", marginBottom: 4, filter: "drop-shadow(0 0 20px rgba(212,160,23,0.6))", ...gold }}>KADOSH</h1>
        <p style={{ textAlign: "center", color: "#7A6010", fontSize: 11, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 24 }}>— AI ORCHESTRATOR —</p>

        {/* Card do plano */}
        <div style={{ borderRadius: 20, border: "1px solid rgba(212,160,23,0.35)", background: "rgba(212,160,23,0.06)", padding: "18px 20px", marginBottom: 24 }}>
          <p style={{ color: "#7A6010", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 4 }}>{plan.modo}</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
            <p style={{ color: "#FFE082", fontSize: 20, fontWeight: 700, margin: 0 }}>{plan.plano}</p>
            <p style={{ color: "#D4A017", fontSize: 18, fontWeight: 700, margin: 0 }}>{plan.priceLabel}</p>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {plan.features.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(212,160,23,0.1)" }}>
                  <td style={{ padding: "7px 0", color: "#D4A017", width: 20, fontSize: 12 }}>✓</td>
                  <td style={{ padding: "7px 0", color: "#C8CDD8", fontSize: 12 }}>{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Fase: WhatsApp + Senha ── */}
        {phase === "phone" && (
          <div>
            <p style={{ color: "#C8CDD8", fontSize: 14, marginBottom: 12, textAlign: "center" }}>Seu WhatsApp e uma senha de acesso</p>
            <input type="tel" placeholder="WhatsApp: 55 11 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} style={input} />
            <input type="password" placeholder="Crie uma senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} style={input} />
            <input type="password" placeholder="Confirme a senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePhone()} style={input} />
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center", marginBottom: 10 }}>{error}</p>}
            <button onClick={handlePhone} disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Aguarde..." : "Ir para pagamento"}
            </button>
          </div>
        )}

        {/* ── Fase: Escolha PIX ou Cartão ── */}
        {phase === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: "#C8CDD8", fontSize: 14, textAlign: "center", marginBottom: 4 }}>Como deseja pagar?</p>
            <button onClick={() => setPhase("pix-email")} style={{ ...btn, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>⚡</span> Pagar com PIX
            </button>
            <button onClick={() => setPhase("card")} style={{ ...btn, background: "rgba(212,160,23,0.15)", border: "1px solid rgba(212,160,23,0.4)", color: "#FFE082", boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>💳</span> Pagar com Cartão
            </button>
          </div>
        )}

        {/* ── Fase: E-mail para PIX ── */}
        {phase === "pix-email" && (
          <div>
            <p style={{ color: "#C8CDD8", fontSize: 14, marginBottom: 12, textAlign: "center" }}>Seu e-mail para gerar o PIX</p>
            <input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePix()} style={input} />
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center", marginBottom: 10 }}>{error}</p>}
            <button onClick={handlePix} disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Gerando PIX..." : "Gerar QR Code PIX"}
            </button>
            <button onClick={() => setPhase("select")} style={{ background: "none", border: "none", color: "#7A6010", fontSize: 13, cursor: "pointer", width: "100%", marginTop: 10, textAlign: "center" }}>
              ← Voltar
            </button>
          </div>
        )}

        {/* ── Fase: QR Code PIX ── */}
        {phase === "pix-qr" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#25D366", fontWeight: 700, fontSize: 15, marginBottom: 16 }}>⚡ PIX gerado! Escaneie para pagar</p>
            {pixQr && <img src={pixQr} alt="QR Code PIX" style={{ width: 200, height: 200, margin: "0 auto 16px", display: "block", borderRadius: 12, background: "white", padding: 8 }} />}
            {pixCode && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: "#C8CDD8", fontSize: 12, marginBottom: 8 }}>Ou copie o código abaixo:</p>
                <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,160,23,0.2)", borderRadius: 12, padding: "10px 14px", fontSize: 11, color: "#D4A017", wordBreak: "break-all", marginBottom: 8 }}>
                  {pixCode.slice(0, 60)}...
                </div>
                <button onClick={copyPix} style={{ ...btn, padding: "10px 0", fontSize: 13 }}>
                  {copied ? "✓ Código copiado!" : "Copiar código PIX"}
                </button>
              </div>
            )}
            <div style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 12, padding: "12px 16px" }}>
              <p style={{ color: "#25D366", fontSize: 13, margin: 0 }}>
                Após o pagamento, você receberá seu acesso via WhatsApp em até 1 minuto.
              </p>
            </div>
          </div>
        )}

        {/* ── Fase: Cartão (MP Brick) ── */}
        {phase === "card" && (
          <div>
            <div id="mp-card-brick" />
            <button onClick={() => { setPhase("select"); brickMounted.current = false; }} style={{ background: "none", border: "none", color: "#7A6010", fontSize: 13, cursor: "pointer", width: "100%", marginTop: 10, textAlign: "center" }}>
              ← Voltar
            </button>
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

export default function AssinarPage() {
  return <Suspense><AssinarForm /></Suspense>;
}
