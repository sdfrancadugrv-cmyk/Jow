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
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: 12,
    border: "1px solid rgba(212,160,23,0.4)",
    background: "rgba(255,255,255,0.06)",
    color: GOLD_LIGHT, fontSize: 16, outline: "none",
    boxSizing: "border-box", textAlign: "center",
  };

  const btnStyle: React.CSSProperties = {
    width: "100%", padding: "14px 0", borderRadius: 24,
    background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`,
    color: "#0A0808", fontWeight: 700, fontSize: 15,
    cursor: "pointer", border: "none",
  };

  const sendOtp = useCallback(async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Digite um número de WhatsApp válido"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/provider/otp", {
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
      const res = await fetch("/api/provider/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone: phone.replace(/\D/g, ""), code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Código inválido"); setLoading(false); return; }
      router.push(data.needsProfile ? "/provider/complete-profile" : "/provider/dashboard");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [phone, otpCode, router]);

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          JENNIFER
        </h1>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 36 }}>
          Área do Prestador
        </p>

        {!otpSent ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <p style={{ color: TEXT, fontSize: 14 }}>Digite seu WhatsApp para entrar</p>
            </div>

            <input
              style={inputStyle}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendOtp()}
              placeholder="55 11 99999-9999"
              type="tel"
            />

            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}

            <button onClick={sendOtp} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer" }}>
              {loading ? "Enviando..." : "Receber código no WhatsApp"}
            </button>

            <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>
              Não tem conta? O cadastro é feito automaticamente.
            </p>
            <p style={{ textAlign: "center", fontSize: 12 }}>
              <a href="/" style={{ color: MUTED }}>← Voltar ao início</a>
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <p style={{ color: TEXT, fontSize: 14 }}>
                Código enviado para <strong style={{ color: GOLD_LIGHT }}>{phone}</strong>
              </p>
              <p style={{ color: LABEL, fontSize: 12, marginTop: 4 }}>Verifique seu WhatsApp.</p>
            </div>

            <input
              style={{ ...inputStyle, fontSize: 24, letterSpacing: "0.4em", fontWeight: 700 }}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && verifyOtp()}
              placeholder="000000"
              maxLength={6}
              type="number"
              autoFocus
            />

            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}

            <button onClick={verifyOtp} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer" }}>
              {loading ? "Verificando..." : "Confirmar"}
            </button>

            <button onClick={() => { setOtpSent(false); setOtpCode(""); setError(""); }} style={{ background: "none", border: "none", color: LABEL, fontSize: 13, cursor: "pointer", textAlign: "center" }}>
              Reenviar código
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
