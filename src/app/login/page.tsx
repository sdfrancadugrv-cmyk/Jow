"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("payment") === "success") {
      setMessage("Pagamento confirmado! Conecte seu WhatsApp para acessar o KADOSH.");
    }
    if (params.get("expired") === "true") {
      setMessage("Sua assinatura expirou. Renove para continuar.");
    }
  }, [params]);

  const sendOtp = useCallback(async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Digite um número de WhatsApp válido"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: clean }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao enviar código"); setLoading(false); return; }
      setOtpSent(true); setLoading(false);
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [phone]);

  const verifyOtp = useCallback(async () => {
    if (!otpCode) { setError("Digite o código"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: phone.replace(/\D/g, ""), code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Código inválido"); setLoading(false); return; }
      router.push("/app");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [phone, otpCode, router]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)" }}
    >
      {/* Névoa de fundo */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%)
        `,
      }} />

      <div className="relative z-10 w-full max-w-sm px-6">

        {/* Título */}
        <div className="text-center mb-10">
          <h1 className="font-bold tracking-[0.35em] leading-none mb-2" style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(2.5rem, 10vw, 4rem)",
            background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px rgba(212,160,23,0.6))",
          }}>
            KADOSH
          </h1>
          <p className="text-xs tracking-[0.4em] uppercase" style={{ color: "#7A6010" }}>
            — AI ORCHESTRATOR —
          </p>
        </div>

        {/* Mensagem de status */}
        {message && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm text-center" style={{
            background: "rgba(212,160,23,0.1)",
            border: "1px solid rgba(212,160,23,0.3)",
            color: "#FFE082",
          }}>
            {message}
          </div>
        )}

        {!otpSent ? (
          <div className="flex flex-col gap-4">
            {/* Ícone WhatsApp */}
            <div className="flex flex-col items-center mb-2">
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "#25D366",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
                boxShadow: "0 0 24px rgba(37,211,102,0.4)",
              }}>
                <svg width="28" height="28" fill="white" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <p className="text-sm" style={{ color: "#C8CDD8" }}>
                Digite seu WhatsApp para entrar
              </p>
            </div>

            <input
              type="tel"
              placeholder="55 11 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              className="w-full px-4 py-3 rounded-full text-sm text-center outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(212,160,23,0.35)",
                color: "#FFE082",
              }}
            />

            {error && <p className="text-center text-sm" style={{ color: "#F97316" }}>{error}</p>}

            <button
              onClick={sendOtp}
              disabled={loading}
              className="w-full py-3 rounded-full font-bold text-sm tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
                color: "#0A0808",
                boxShadow: "0 0 24px rgba(218,165,32,0.5)",
              }}
            >
              {loading ? "Enviando..." : "Receber código no WhatsApp"}
            </button>

            <p className="text-center text-xs mt-2" style={{ color: "#4A3A08" }}>
              Não tem conta?{" "}
              <a href="/register" style={{ color: "#7A6010", textDecoration: "underline" }}>
                Assinar o KADOSH
              </a>
            </p>

            <p className="text-center text-xs">
              <a href="/" style={{ color: "#3A2C06" }}>← Voltar ao início</a>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="text-center mb-2">
              <p className="text-sm" style={{ color: "#C8CDD8" }}>
                Código enviado para <strong style={{ color: "#FFE082" }}>{phone}</strong>
              </p>
              <p className="text-xs mt-1" style={{ color: "#7A6010" }}>
                Verifique seu WhatsApp.
              </p>
            </div>

            <input
              type="number"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
              maxLength={6}
              autoFocus
              className="w-full px-4 py-3 rounded-full text-center outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(212,160,23,0.35)",
                color: "#FFE082",
                fontSize: 24,
                letterSpacing: "0.4em",
                fontWeight: 700,
              }}
            />

            {error && <p className="text-center text-sm" style={{ color: "#F97316" }}>{error}</p>}

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="w-full py-3 rounded-full font-bold text-sm tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
                color: "#0A0808",
                boxShadow: "0 0 24px rgba(218,165,32,0.5)",
              }}
            >
              {loading ? "Verificando..." : "Confirmar"}
            </button>

            <button
              onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }}
              className="text-center text-xs transition-opacity hover:opacity-70"
              style={{ background: "none", border: "none", color: "#7A6010", cursor: "pointer" }}
            >
              Reenviar código
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
