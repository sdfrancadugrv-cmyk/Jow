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

export default function ServicesNewPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "formatting" | "sending">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formattedDesc, setFormattedDesc] = useState("");

  const [form, setForm] = useState({
    clientName: "", clientPhone: "", serviceType: "", description: "", scheduledDate: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = useCallback(async () => {
    if (!form.clientName || !form.clientPhone || !form.serviceType || !form.scheduledDate || !form.description.trim()) {
      setError("Preencha todos os campos obrigatórios."); return;
    }
    setError(""); setLoading(true); setStep("formatting");

    // IA formata a descrição
    let finalDesc = form.description;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("/api/services/format-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: form.description, serviceType: form.serviceType }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.formatted) finalDesc = data.formatted;
    } catch { /* usa descrição original se falhar */ }

    setFormattedDesc(finalDesc);

    // Captura GPS e envia
    if (!navigator.geolocation) {
      setError("Seu navegador não suporta geolocalização."); setStep("form"); setLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setStep("sending");
        try {
          const res = await fetch("/api/services/request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, description: finalDesc, clientLat: latitude, clientLng: longitude }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error || "Erro ao criar pedido"); setStep("form"); setLoading(false); return; }
          router.push(`/services/${data.requestId}`);
        } catch {
          setError("Erro de conexão."); setStep("form"); setLoading(false);
        }
      },
      (err) => {
        const msg = err.code === 1
          ? "Permissão de localização negada. Ative o GPS nas configurações do navegador."
          : err.code === 3
          ? "Tempo esgotado ao obter localização. Tente novamente."
          : "Não foi possível obter sua localização.";
        setError(msg); setStep("form"); setLoading(false);
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }, [form, router]);

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
          Serviços Locais
        </p>

        {(step === "formatting" || step === "sending") && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", border: `3px solid ${GOLD}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
            <p style={{ color: TEXT, fontSize: 14 }}>
              {step === "formatting" ? "Organizando sua solicitação..." : "Buscando prestadores perto de você..."}
            </p>
            {step === "sending" && formattedDesc && (
              <div style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(212,160,23,0.3)", background: "rgba(212,160,23,0.06)", maxWidth: 320, textAlign: "left" }}>
                <p style={{ color: LABEL, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Pedido enviado aos prestadores</p>
                <p style={{ color: TEXT, fontSize: 13, lineHeight: 1.6 }}>{formattedDesc}</p>
              </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {step === "form" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
              {/* Atalhos — 5 mais pedidos */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {[
                  { value: "pedreiro", label: "Pedreiro" },
                  { value: "eletricista", label: "Eletricista" },
                  { value: "faxineira", label: "Faxineira" },
                  { value: "baba", label: "Babá" },
                  { value: "pintor", label: "Pintor" },
                ].map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, serviceType: s.value }))}
                    style={{
                      padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `1px solid rgba(212,160,23,${form.serviceType === s.value ? "0.8" : "0.3"})`,
                      background: form.serviceType === s.value ? "rgba(212,160,23,0.18)" : "rgba(255,255,255,0.03)",
                      color: form.serviceType === s.value ? GOLD_LIGHT : LABEL,
                      transition: "all 0.15s",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.serviceType} onChange={set("serviceType")}>
                <option value="">Ou escolha na lista completa...</option>
                {SERVICE_CATEGORIES.map(cat => (
                  <optgroup key={cat.label} label={cat.label}>
                    {cat.services.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Data desejada</label>
              <input style={inputStyle} type="date" value={form.scheduledDate} onChange={set("scheduledDate")} />
            </div>
            <div>
              <label style={labelStyle}>Descreva o que você precisa <span style={{ color: "#F97316" }}>*</span></label>
              <textarea
                value={form.description}
                onChange={set("description")}
                placeholder="Escreva com suas palavras — ex: minha tomada está dando choque, moro em apartamento de 2 quartos, precisa de laudo rápido..."
                rows={4}
                style={{ ...inputStyle, resize: "none" } as React.CSSProperties}
              />
              <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Nossa IA vai organizar seu pedido antes de enviar aos prestadores.</p>
            </div>

            {error && <p style={{ color: "#F97316", fontSize: 13, textAlign: "center" }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ padding: "13px 0", borderRadius: 24, background: `linear-gradient(135deg, #C8900A, ${GOLD}, #C8900A)`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer", border: "none", opacity: loading ? 0.6 : 1 }}
            >
              Buscar prestadores
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: TEXT }}>
              Quer oferecer serviços? <a href="/provider/register" style={{ color: GOLD, fontWeight: 600 }}>Cadastre-se aqui</a>
            </p>
            <p style={{ textAlign: "center", fontSize: 12, color: MUTED }}>
              Já tem cadastro de prestador? <a href="/provider/login" style={{ color: GOLD }}>Entrar</a>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
