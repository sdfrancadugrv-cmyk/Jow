"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const SERVICE_TYPES = [
  { value: "faxineira", label: "Faxineira / Diarista" },
  { value: "pedreiro",  label: "Pedreiro" },
  { value: "eletricista", label: "Eletricista" },
  { value: "encanador", label: "Encanador" },
  { value: "pintor",    label: "Pintor" },
  { value: "outros",    label: "Outros serviços" },
];

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";

export default function ProviderRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "gps" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "", serviceType: "",
  });
  const [location, setLocation] = useState<{ lat: number; lng: number; city: string } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const captureGPS = useCallback(() => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Geocoding reverso simples via nominatim (gratuito)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || "";
          setLocation({ lat: latitude, lng: longitude, city });
        } catch {
          setLocation({ lat: latitude, lng: longitude, city: "" });
        }
        setLoading(false);
        setStep("done");
      },
      () => { setError("Não foi possível obter sua localização. Verifique as permissões do navegador."); setLoading(false); }
    );
  }, []);

  const submit = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    setError("");
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
      setError("Erro de conexão");
      setLoading(false);
    }
  }, [form, location, router]);

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid rgba(212,160,23,0.35)`,
    background: "rgba(255,255,255,0.04)",
    color: GOLD_LIGHT,
    fontSize: 14,
    outline: "none",
  } as React.CSSProperties;

  const labelStyle = { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#6A5010", marginBottom: 4, display: "block" };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: "#4A3A08", fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
          Cadastro de Prestador
        </p>

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
              <label style={labelStyle}>Tipo de serviço</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.serviceType} onChange={set("serviceType")}>
                <option value="">Selecione...</option>
                {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {error && <p style={{ color: "#F97316", fontSize: 12, textAlign: "center" }}>{error}</p>}

            <button
              onClick={() => {
                if (!form.name || !form.email || !form.password || !form.phone || !form.serviceType) {
                  setError("Preencha todos os campos"); return;
                }
                setError(""); setStep("gps");
              }}
              style={{ padding: "12px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", cursor: "pointer", border: "none" }}
            >
              Continuar
            </button>
            <p style={{ textAlign: "center", fontSize: 11, color: "#3A2C06" }}>
              Já tem conta? <a href="/provider/login" style={{ color: GOLD }}>Entrar</a>
            </p>
          </div>
        )}

        {step === "gps" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
              📍
            </div>
            <p style={{ color: "#C8CDD8", fontSize: 14, lineHeight: 1.6 }}>
              Precisamos da sua localização para enviar pedidos próximos de você.
            </p>
            {error && <p style={{ color: "#F97316", fontSize: 12 }}>{error}</p>}
            <button
              onClick={captureGPS}
              disabled={loading}
              style={{ padding: "12px 32px", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Obtendo localização..." : "Permitir localização"}
            </button>
          </div>
        )}

        {step === "done" && location && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
            <p style={{ color: "#C8CDD8", fontSize: 14 }}>
              Localização capturada{location.city ? ` — ${location.city}` : ""}.
            </p>
            <p style={{ color: "#6A5010", fontSize: 12 }}>
              Plano prestador: <strong style={{ color: GOLD }}>R$29,90/mês</strong>
            </p>
            {error && <p style={{ color: "#F97316", fontSize: 12 }}>{error}</p>}
            <button
              onClick={submit}
              disabled={loading}
              style={{ padding: "12px 32px", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Cadastrando..." : "Finalizar cadastro"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
