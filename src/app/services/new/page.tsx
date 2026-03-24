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

export default function ServicesNewPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "gps" | "sending">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    clientName: "", clientPhone: "", serviceType: "", description: "", scheduledDate: "",
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const captureAndSend = useCallback(() => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setStep("sending");

        try {
          const res = await fetch("/api/services/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...form,
              clientLat: latitude,
              clientLng: longitude,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error || "Erro ao criar pedido"); setStep("form"); setLoading(false); return; }
          router.push(`/services/${data.requestId}`);
        } catch {
          setError("Erro de conexão."); setStep("form"); setLoading(false);
        }
      },
      () => { setError("Não foi possível obter sua localização."); setLoading(false); }
    );
  }, [form, router]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: `1px solid rgba(212,160,23,0.35)`,
    background: "rgba(255,255,255,0.04)",
    color: GOLD_LIGHT,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6A5010", marginBottom: 4, display: "block" };

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: "#4A3A08", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 28 }}>
          Serviços Locais
        </p>

        {step === "sending" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: `3px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "#C8CDD8", fontSize: 14 }}>Buscando prestadores perto de você...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Seu nome</label>
              <input style={inputStyle} value={form.clientName} onChange={set("clientName")} placeholder="Como devemos te chamar?" />
            </div>
            <div>
              <label style={labelStyle}>Seu WhatsApp (com DDD)</label>
              <input style={inputStyle} value={form.clientPhone} onChange={set("clientPhone")} placeholder="55 11 99999-9999" />
            </div>
            <div>
              <label style={labelStyle}>Qual serviço você precisa?</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.serviceType} onChange={set("serviceType")}>
                <option value="">Selecione...</option>
                {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data desejada</label>
              <input style={inputStyle} type="date" value={form.scheduledDate} onChange={set("scheduledDate")} />
            </div>
            <div>
              <label style={labelStyle}>Detalhes adicionais (opcional)</label>
              <textarea
                value={form.description}
                onChange={set("description")}
                placeholder="Ex: apartamento de 2 quartos, precisa de material..."
                rows={3}
                style={{ ...inputStyle, resize: "none" } as React.CSSProperties}
              />
            </div>

            {error && <p style={{ color: "#F97316", fontSize: 12, textAlign: "center" }}>{error}</p>}

            <button
              onClick={() => {
                if (!form.clientName || !form.clientPhone || !form.serviceType || !form.scheduledDate) {
                  setError("Preencha todos os campos obrigatórios."); return;
                }
                setError("");
                captureAndSend();
              }}
              disabled={loading}
              style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 13, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}
            >
              Buscar prestadores
            </button>

            <p style={{ textAlign: "center", fontSize: 11, color: "#3A2C06" }}>
              Quer oferecer serviços? <a href="/provider/register" style={{ color: GOLD }}>Cadastre-se aqui</a>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
