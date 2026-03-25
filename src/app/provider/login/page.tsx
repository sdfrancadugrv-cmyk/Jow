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

type Step = "phone" | "services" | "location";

export default function ProviderLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [providerId, setProviderId] = useState("");
  const [isExisting, setIsExisting] = useState(false);

  const toggleService = (value: string) => {
    setSelectedServices(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    );
  };

  // Passo 1: registra/loga pelo telefone
  const handlePhone = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Digite um número de WhatsApp válido"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/provider/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao continuar"); setLoading(false); return; }
      setProviderId(data.providerId);
      if (data.needsProfile) {
        setStep("services");
      } else {
        setIsExisting(true);
        router.push("/provider/dashboard");
      }
      setLoading(false);
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  };

  // Passo 2: salva serviços e vai para localização
  const handleServices = () => {
    if (selectedServices.length === 0) { setError("Selecione pelo menos uma habilidade"); return; }
    if (!name.trim()) { setError("Digite seu nome"); return; }
    setError("");
    setStep("location");
  };

  // Passo 3: captura GPS
  const captureGPS = useCallback(() => {
    setLoading(true); setError("");
    if (!navigator.geolocation) { setStep("location"); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let city = "";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          city = data.address?.city || data.address?.town || data.address?.village || "";
        } catch { /* ignora */ }
        await submitProfile({ lat: latitude, lng: longitude, city });
      },
      () => { setLoading(false); submitWithCity(); },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, [name, selectedServices, cityInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Passo 3b: geocoda cidade manual
  const submitWithCity = useCallback(async () => {
    if (!cityInput.trim()) { setError("Digite sua cidade"); return; }
    setLoading(true); setError("");
    try {
      const q = encodeURIComponent(cityInput + ", Brasil");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { "Accept-Language": "pt-BR", "User-Agent": "Kadosh/1.0" },
      });
      const data = await res.json();
      if (!data?.length) { setError("Cidade não encontrada"); setLoading(false); return; }
      await submitProfile({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), city: cityInput });
    } catch {
      setError("Erro ao buscar localização"); setLoading(false);
    }
  }, [cityInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitProfile = async (loc: { lat: number; lng: number; city: string }) => {
    setLoading(true);
    try {
      const res = await fetch("/api/provider/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          serviceType: selectedServices.join(","),
          ...loc,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao salvar"); setLoading(false); return; }
      router.push("/provider/subscribe");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: 12,
    border: "1px solid rgba(212,160,23,0.4)",
    background: "rgba(255,255,255,0.06)",
    color: GOLD_LIGHT, fontSize: 14, outline: "none", boxSizing: "border-box",
  };
  const btnStyle: React.CSSProperties = {
    width: "100%", padding: "14px 0", borderRadius: 24,
    background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`,
    color: "#0A0808", fontWeight: 700, fontSize: 15, cursor: "pointer", border: "none",
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
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 28 }}>
          {step === "phone" ? "Área do Prestador" : step === "services" ? "Seus serviços" : "Sua localização"}
        </p>

        {/* ── Passo 1: Telefone ── */}
        {step === "phone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <svg width="28" height="28" fill="white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <p style={{ color: TEXT, fontSize: 14 }}>Digite seu WhatsApp para entrar</p>
            </div>
            <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && handlePhone()} placeholder="55 11 99999-9999" type="tel" />
            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
            <button onClick={handlePhone} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1, cursor: loading ? "default" : "pointer" }}>
              {loading ? "Aguarde..." : "Continuar"}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>Não tem conta? O cadastro é feito automaticamente.</p>
            <p style={{ textAlign: "center", fontSize: 12 }}><a href="/" style={{ color: MUTED }}>← Voltar ao início</a></p>
          </div>
        )}

        {/* ── Passo 2: Serviços ── */}
        {step === "services" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Seu nome completo</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Como os clientes vão te ver" />
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
                          <button key={s.value} type="button" onClick={() => toggleService(s.value)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer", border: selected ? `1.5px solid ${GOLD}` : "1.5px solid rgba(212,160,23,0.25)", background: selected ? "rgba(212,160,23,0.18)" : "rgba(255,255,255,0.04)", color: selected ? GOLD_LIGHT : TEXT, fontWeight: selected ? 600 : 400, transition: "all 0.15s" }}>
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
                  {selectedServices.length} selecionado{selectedServices.length > 1 ? "s" : ""} · Plano: <strong>{getProviderPriceLabel(selectedServices.join(","))}/mês</strong>
                </p>
              )}
            </div>

            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}
            <button onClick={handleServices} style={btnStyle}>Continuar</button>
          </div>
        )}

        {/* ── Passo 3: Localização ── */}
        {step === "location" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD_LIGHT}, ${GOLD})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 16px" }}>
                📍
              </div>
              <p style={{ color: TEXT, fontSize: 14, lineHeight: 1.6 }}>Precisamos da sua localização para enviar pedidos próximos de você.</p>
            </div>

            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}

            <button onClick={captureGPS} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1, cursor: loading ? "default" : "pointer" }}>
              {loading ? "Obtendo localização..." : "Usar minha localização atual"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
              <span style={{ color: MUTED, fontSize: 12 }}>ou</span>
              <div style={{ flex: 1, height: 1, background: "rgba(212,160,23,0.2)" }} />
            </div>

            <div>
              <label style={labelStyle}>Digite sua cidade</label>
              <input style={inputStyle} value={cityInput} onChange={e => setCityInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submitWithCity()} placeholder="Ex: Campinas SP, Lapa São Paulo..." autoFocus />
            </div>
            <button onClick={submitWithCity} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1, cursor: loading ? "default" : "pointer" }}>
              {loading ? "Finalizando..." : "Finalizar cadastro"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
