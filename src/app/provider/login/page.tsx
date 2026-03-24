"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const LABEL = "#A08030";
const MUTED = "#7A6018";

export default function ProviderLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"social" | "email" | "phone">("social");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const urlError = searchParams?.get("error");

  const errorMessages: Record<string, string> = {
    google_cancelled: "Login com Google cancelado.",
    google_token: "Erro ao autenticar com Google. Tente novamente.",
    google_fail: "Falha no login com Google. Tente novamente.",
    fb_cancelled: "Login com Facebook cancelado.",
    fb_token: "Erro ao autenticar com Facebook. Tente novamente.",
    fb_fail: "Falha no login com Facebook. Tente novamente.",
  };

  const submitEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/provider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Credenciais inválidas"); setLoading(false); return; }
      router.push("/provider/dashboard");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [email, password, router]);

  const sendOtp = useCallback(async () => {
    if (!phone.replace(/\D/g, "")) { setError("Digite seu número"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/provider/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone }),
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
      const res = await fetch("/api/provider/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Código inválido"); setLoading(false); return; }
      router.push(data.needsProfile ? "/provider/complete-profile" : "/provider/dashboard");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [phone, otpCode, router]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 12,
    border: "1px solid rgba(212,160,23,0.4)",
    background: "rgba(255,255,255,0.06)",
    color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
    color: LABEL, marginBottom: 4, display: "block",
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
          Área do Prestador
        </p>

        {(urlError || error) && (
          <p style={{ color: "#F97316", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
            {error || (urlError ? errorMessages[urlError] || "Erro no login" : "")}
          </p>
        )}

        {mode === "social" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Google */}
            <a
              href="/api/provider/google/init"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "13px 0", borderRadius: 24, background: "#fff", color: "#1a1a1a", fontWeight: 700, fontSize: 14, textDecoration: "none", border: "none" }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.7 2.4 30.2 0 24 0 14.8 0 6.9 5.4 3.1 13.2l7.9 6.1C13 13.5 18.1 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M11 28.3c-.6-1.8-1-3.7-1-5.8s.4-4 1-5.8L3.1 10.6C1.1 14.5 0 18.9 0 23.5s1.1 9 3.1 12.9L11 28.3z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-5.9 0-10.9-4-12.7-9.3l-7.9 6.1C6.9 43.1 14.8 48 24 48z"/></svg>
              Entrar com Google
            </a>

            {/* Facebook */}
            <a
              href="/api/provider/facebook/init"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "13px 0", borderRadius: 24, background: "#1877F2", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
            >
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              Entrar com Facebook
            </a>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
              <span style={{ color: MUTED, fontSize: 12 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
            </div>

            {/* WhatsApp OTP */}
            <button
              onClick={() => setMode("phone")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "13px 0", borderRadius: 24, background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none" }}
            >
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Entrar com WhatsApp
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
              <span style={{ color: MUTED, fontSize: 12 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
            </div>

            <button
              onClick={() => setMode("email")}
              style={{ padding: "12px 0", borderRadius: 24, background: "transparent", color: LABEL, fontWeight: 600, fontSize: 13, cursor: "pointer", border: `1px solid rgba(212,160,23,0.35)` }}
            >
              Entrar com email e senha
            </button>

            <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>
              Não tem conta? <a href="/provider/register" style={{ color: GOLD }}>Cadastre-se aqui</a>
            </p>
            <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>
              <a href="/" style={{ color: MUTED }}>← Voltar ao início</a>
            </p>
          </div>
        )}

        {mode === "email" && (
          <form onSubmit={submitEmail} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div>
              <label style={labelStyle}>Senha</label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" required />
            </div>
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <button type="button" onClick={() => { setMode("social"); setError(""); }} style={{ padding: "10px 0", borderRadius: 24, background: "none", border: "none", color: LABEL, fontSize: 13, cursor: "pointer" }}>
              ← Outras opções
            </button>
          </form>
        )}

        {mode === "phone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!otpSent ? (
              <>
                <p style={{ color: TEXT, fontSize: 14, textAlign: "center" }}>
                  Vamos enviar um código de 6 dígitos no seu WhatsApp.
                </p>
                <div>
                  <label style={labelStyle}>Seu WhatsApp (com DDD)</label>
                  <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="55 11 99999-9999" />
                </div>
                {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
                <button onClick={sendOtp} disabled={loading} style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "Enviando..." : "Enviar código"}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: TEXT, fontSize: 14, textAlign: "center" }}>
                  Código enviado para <strong style={{ color: GOLD_LIGHT }}>{phone}</strong>.<br />
                  <span style={{ color: LABEL, fontSize: 12 }}>Verifique seu WhatsApp.</span>
                </p>
                <div>
                  <label style={labelStyle}>Código de 6 dígitos</label>
                  <input style={{ ...inputStyle, textAlign: "center", fontSize: 22, letterSpacing: "0.3em" }} value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="000000" maxLength={6} />
                </div>
                {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
                <button onClick={verifyOtp} disabled={loading} style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "Verificando..." : "Confirmar"}
                </button>
                <button onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }} style={{ background: "none", border: "none", color: LABEL, fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                  Reenviar código
                </button>
              </>
            )}
            <button onClick={() => { setMode("social"); setError(""); setOtpSent(false); }} style={{ padding: "10px 0", borderRadius: 24, background: "none", border: "none", color: LABEL, fontSize: 13, cursor: "pointer" }}>
              ← Outras opções
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
