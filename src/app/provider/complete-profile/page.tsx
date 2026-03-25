"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SERVICE_CATEGORIES, getProviderPriceLabel } from "@/lib/service-types";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const LABEL = "#A08030";
const MUTED = "#7A6018";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "gps" | "city">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [form, setForm] = useState({ name: "", dailyRate: "" });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; city: string } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleService = (value: string) => {
    setSelectedServices(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

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
        submitProfile({ lat: latitude, lng: longitude, city: "" });
      },
      () => { setStep("city"); setLoading(false); },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
      const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), city: cityInput };
      setLocation(loc);
      await submitProfile(loc);
    } catch {
      setError("Erro ao buscar localização"); setLoading(false);
    }
  }, [cityInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitProfile = useCallback(async (loc: { lat: number; lng: number; city: string }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/provider/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          serviceType: selectedServices.join(","),
          dailyRate: form.dailyRate ? parseFloat(form.dailyRate) : null,
          ...loc,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao salvar"); setLoading(false); return; }
      router.push("/provider/subscribe");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [form, selectedServices, router]);

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
      <div style={{ width: "100%", maxWidth: 480 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8 }}>
          Complete seu perfil
        </p>
        <p style={{ textAlign: "center", color: TEXT, fontSize: 13, marginBottom: 28 }}>
          Só falta mais um passo para começar a receber pedidos.
        </p>

        {step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Seu nome completo</label>
              <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="Como os clientes vão te ver" />
            </div>
            <div>
              <label style={labelStyle}>Valor médio da diária (R$)</label>
              <input style={inputStyle} type="number" min="0" value={form.dailyRate} onChange={set("dailyRate")} placeholder="Ex: 250" />
            </div>

            <div>
              <label style={labelStyle}>Suas habilidades / serviços <span style={{ color: GOLD, fontSize: 11 }}>(selecione quantas quiser)</span></label>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
                {SERVICE_CATEGORIES.map(cat => (
                  <div key={cat.label}>
                    <p style={{ fontSize: 11, color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, marginTop: 4 }}>{cat.label}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {cat.services.map(s => {
                        const selected = selectedServices.includes(s.value);
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => toggleService(s.value)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 20,
                              fontSize: 13,
                              cursor: "pointer",
                              border: selected ? `1.5px solid ${GOLD}` : "1.5px solid rgba(212,160,23,0.25)",
                              background: selected ? "rgba(212,160,23,0.18)" : "rgba(255,255,255,0.04)",
                              color: selected ? GOLD_LIGHT : TEXT,
                              fontWeight: selected ? 600 : 400,
                              transition: "all 0.15s",
                            }}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {selectedServices.length > 0 && (
                <p style={{ fontSize: 12, color: GOLD, marginTop: 8 }}>
                  {selectedServices.length} selecionado{selectedServices.length > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
            <button
              onClick={() => {
                if (!form.name) { setError("Digite seu nome"); return; }
                if (selectedServices.length === 0) { setError("Selecione pelo menos uma habilidade"); return; }
                setError(""); setStep("gps");
              }}
              style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none" }}
            >
              Continuar
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
            <p style={{ color: LABEL, fontSize: 13 }}>
              Plano prestador: <strong style={{ color: GOLD }}>{getProviderPriceLabel(selectedServices.join(","))}/mês</strong>
            </p>
            {error && <p style={{ color: "#F97316", fontSize: 13 }}>{error}</p>}
            <button
              onClick={captureGPS}
              disabled={loading}
              style={{ padding: "13px 32px", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Obtendo localização..." : "Permitir localização"}
            </button>
            <button
              onClick={() => setStep("city")}
              style={{ background: "none", border: "none", color: LABEL, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
            >
              Digitar cidade manualmente
            </button>
          </div>
        )}

        {step === "city" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: TEXT, fontSize: 14, textAlign: "center" }}>Digite sua cidade para continuar.</p>
            <div>
              <label style={labelStyle}>Sua cidade / bairro</label>
              <input
                style={inputStyle}
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && geocodeCity()}
                placeholder="Ex: Campinas SP, Lapa São Paulo..."
                autoFocus
              />
            </div>
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
            <button
              onClick={geocodeCity}
              disabled={loading}
              style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Finalizando..." : "Finalizar cadastro"}
            </button>
          </div>
        )}

        {location && !error && (
          <p style={{ textAlign: "center", fontSize: 12, color: MUTED, marginTop: 12 }}>
            📍 {location.city || "Localização capturada"}
          </p>
        )}
      </div>
    </main>
  );
}
