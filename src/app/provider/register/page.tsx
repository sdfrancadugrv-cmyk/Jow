"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_CATEGORIES } from "@/lib/service-types";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const LABEL = "#A08030";
const MUTED = "#7A6018";

export default function ProviderRegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"social" | "email">("social");
  const [step, setStep] = useState<"form" | "gps" | "city" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cityInput, setCityInput] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", serviceType: "" });
  const [location, setLocation] = useState<{ lat: number; lng: number; city: string } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const captureGPS = useCallback(() => {
    setLoading(true); setError("");
    if (!navigator.geolocation) { setStep("city"); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          setLocation({ lat: latitude, lng: longitude, city });
        } catch {
          setLocation({ lat: latitude, lng: longitude, city: "" });
        }
        setLoading(false);
        setStep("done");
      },
      () => { setStep("city"); setLoading(false); },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, []);

  const geocodeCity = useCallback(async () => {
    if (!cityInput.trim()) { setError("Digite sua cidade"); return; }
    setLoading(true); setError("");
    try {
      const q = encodeURIComponent(cityInput + ", Brasil");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { "Accept-Language": "pt-BR", "User-Agent": "Kadosh/1.0" },
      });
      const data = await res.json();
      if (!data?.length) { setError("Cidade não encontrada"); setLoading(false); return; }
      setLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), city: cityInput });
      setLoading(false);
      setStep("done");
    } catch {
      setError("Erro ao buscar localização"); setLoading(false);
    }
  }, [cityInput]);

  const submit = useCallback(async () => {
    if (!location) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/provider/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...location }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao cadastrar"); setLoading(false); return; }
      router.push("/provider/dashboard");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [form, location, router]);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 12,
    border: "1px solid rgba(212,160,23,0.4)",
    background: "rgba(255,255,255,0.06)",
    color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase",
    color: LABEL, marginBottom: 5, display: "block", fontWeight: 600,
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 28 }}>
          Cadastro de Prestador
        </p>

        {/* MODO SOCIAL */}
        {mode === "social" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ color: TEXT, fontSize: 13, textAlign: "center", marginBottom: 4 }}>
              Escolha como quer se cadastrar:
            </p>

            <a
              href="/api/provider/google/init"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "13px 0", borderRadius: 24, background: "#fff", color: "#1a1a1a", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.7 2.4 30.2 0 24 0 14.8 0 6.9 5.4 3.1 13.2l7.9 6.1C13 13.5 18.1 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/><path fill="#FBBC05" d="M11 28.3c-.6-1.8-1-3.7-1-5.8s.4-4 1-5.8L3.1 10.6C1.1 14.5 0 18.9 0 23.5s1.1 9 3.1 12.9L11 28.3z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.2-8.4 2.2-5.9 0-10.9-4-12.7-9.3l-7.9 6.1C6.9 43.1 14.8 48 24 48z"/></svg>
              Cadastrar com Google
            </a>

            <a
              href="/api/provider/facebook/init"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "13px 0", borderRadius: 24, background: "#1877F2", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}
            >
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              Cadastrar com Facebook
            </a>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
              <span style={{ color: MUTED, fontSize: 12 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
            </div>

            <button
              onClick={() => { setMode("email"); setStep("form"); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 0", borderRadius: 24, background: "transparent", color: LABEL, fontWeight: 700, fontSize: 14, cursor: "pointer", border: `1px solid rgba(212,160,23,0.35)` }}
            >
              Cadastrar com email e senha
            </button>

            <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>
              Já tem conta? <a href="/provider/login" style={{ color: GOLD }}>Entrar</a>
            </p>
            <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>
              <a href="/" style={{ color: MUTED }}>← Voltar ao início</a>
            </p>
          </div>
        )}

        {/* MODO EMAIL */}
        {mode === "email" && (
          <>
            {step === "form" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nome completo</label>
                  <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Seu nome" />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp (com DDD)</label>
                  <input style={inputStyle} value={form.phone} onChange={set("phone")} placeholder="55 11 99999-9999" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input style={inputStyle} type="email" value={form.email} onChange={set("email")} placeholder="seu@email.com" />
                </div>
                <div>
                  <label style={labelStyle}>Senha</label>
                  <input style={inputStyle} type="password" value={form.password} onChange={set("password")} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label style={labelStyle}>Sua especialidade / serviço</label>
                  <select style={{ ...inputStyle, cursor: "pointer" }} value={form.serviceType} onChange={set("serviceType")}>
                    <option value="">Selecione...</option>
                    {SERVICE_CATEGORIES.map(cat => (
                      <optgroup key={cat.label} label={cat.label}>
                        {cat.services.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
                <button
                  onClick={() => {
                    if (!form.name || !form.email || !form.password || !form.phone || !form.serviceType) {
                      setError("Preencha todos os campos"); return;
                    }
                    setError(""); setStep("gps");
                  }}
                  style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none" }}
                >
                  Continuar
                </button>
                <button onClick={() => { setMode("social"); setError(""); }} style={{ padding: "10px 0", borderRadius: 24, background: "none", border: "none", color: LABEL, fontSize: 13, cursor: "pointer" }}>
                  ← Outras opções
                </button>
              </div>
            )}

            {step === "gps" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
                  📍
                </div>
                <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6 }}>
                  Precisamos da sua localização para enviar pedidos próximos de você.
                </p>
                {error && <p style={{ color: "#F97316", fontSize: 13 }}>{error}</p>}
                <button onClick={captureGPS} disabled={loading} style={{ padding: "13px 32px", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "Obtendo localização..." : "Permitir localização"}
                </button>
                <button onClick={() => setStep("city")} style={{ background: "none", border: "none", color: LABEL, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
                  Digitar cidade manualmente
                </button>
              </div>
            )}

            {step === "city" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Sua cidade / bairro</label>
                  <input style={inputStyle} value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={e => e.key === "Enter" && geocodeCity()} placeholder="Ex: Campinas SP, Lapa São Paulo..." autoFocus />
                </div>
                {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
                <button onClick={geocodeCity} disabled={loading} style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "Buscando..." : "Continuar"}
                </button>
              </div>
            )}

            {step === "done" && location && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
                <p style={{ color: TEXT, fontSize: 14 }}>
                  Localização capturada{location.city ? ` — ${location.city}` : ""}.
                </p>
                <p style={{ color: LABEL, fontSize: 13 }}>
                  Plano prestador: <strong style={{ color: GOLD }}>R$29,90/mês</strong>
                </p>
                {error && <p style={{ color: "#F97316", fontSize: 13 }}>{error}</p>}
                <button onClick={submit} disabled={loading} style={{ padding: "13px 32px", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}>
                  {loading ? "Cadastrando..." : "Finalizar cadastro"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
