"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SERVICE_CATEGORIES, SERVICE_LABELS } from "@/lib/service-types";

const BG = "#070B18";
const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const MUTED = "#7A6018";
const LABEL = "#A08030";

function PrestadoresContent() {
  const searchParams = useSearchParams();
  const [servico, setServico] = useState(searchParams?.get("servico") || "");
  const [cidade, setCidade] = useState("");
  const [prestadores, setPrestadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscou, setBuscou] = useState(false);

  async function buscar() {
    setLoading(true); setBuscou(true);
    const params = new URLSearchParams();
    if (servico) params.set("servico", servico);
    if (cidade) params.set("cidade", cidade);
    const res = await fetch(`/api/provider/lista?${params}`);
    const data = await res.json();
    setPrestadores(data.prestadores || []);
    setLoading(false);
  }

  useEffect(() => { buscar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "Georgia, serif", fontSize: "1.4rem", letterSpacing: "0.2em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            marginBottom: 4,
          }}>
            PRESTADORES DE SERVIÇO
          </h1>
          <p style={{ color: MUTED, fontSize: 12 }}>Entre em contato diretamente pelo WhatsApp</p>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <select
            value={servico}
            onChange={e => setServico(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(212,160,23,0.3)", background: "rgba(255,255,255,0.05)", color: servico ? GOLD_LIGHT : MUTED, fontSize: 14, outline: "none" }}
          >
            <option value="">Todos os serviços</option>
            {SERVICE_CATEGORIES.map(cat => (
              <optgroup key={cat.label} label={cat.label}>
                {cat.services.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={cidade}
              onChange={e => setCidade(e.target.value)}
              onKeyDown={e => e.key === "Enter" && buscar()}
              placeholder="Filtrar por cidade..."
              style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(212,160,23,0.3)", background: "rgba(255,255,255,0.05)", color: GOLD_LIGHT, fontSize: 14, outline: "none" }}
            />
            <button
              onClick={buscar}
              style={{ padding: "12px 20px", borderRadius: 10, background: GOLD, border: "none", color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <p style={{ color: MUTED, textAlign: "center", marginTop: 40 }}>Buscando...</p>
        ) : prestadores.length === 0 && buscou ? (
          <p style={{ color: MUTED, textAlign: "center", marginTop: 40 }}>Nenhum prestador encontrado.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {prestadores.map(p => (
              <div key={p.id} style={{
                display: "flex", gap: 14, alignItems: "center",
                padding: "16px", borderRadius: 14,
                border: "1px solid rgba(212,160,23,0.2)",
                background: "rgba(212,160,23,0.04)",
              }}>
                {/* Foto */}
                {p.foto ? (
                  <img src={p.foto} alt={p.name} style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${GOLD}` }} />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(212,160,23,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 24 }}>
                    👤
                  </div>
                )}

                {/* Dados */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{p.name}</p>
                  <p style={{ color: LABEL, fontSize: 13, marginBottom: 2 }}>
                    {p.serviceType?.split(",").map((s: string) => SERVICE_LABELS[s.trim()] || s.trim()).join(", ")}
                  </p>
                  <p style={{ color: MUTED, fontSize: 12 }}>📍 {p.city}</p>
                  {p.rating > 0 && p.reviewCount > 0 && (
                    <p style={{ color: GOLD, fontSize: 12, marginTop: 2 }}>★ {p.rating.toFixed(1)} · {p.reviewCount} avaliações</p>
                  )}
                </div>

                {/* Botão WhatsApp */}
                <a
                  href={`https://wa.me/${(p.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vi seu perfil na Jennifer e gostaria de contratar seus serviços.")}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: "none", flexShrink: 0 }}
                >
                  <div style={{ background: "#25D366", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Chamar</span>
                  </div>
                </a>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a href="/provider/login" style={{ color: MUTED, fontSize: 12, textDecoration: "none" }}>
            Sou prestador — quero me cadastrar
          </a>
        </div>
      </div>
    </main>
  );
}

export default function PrestadoresPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#070B18", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#7A6018" }}>Carregando...</p></main>}>
      <PrestadoresContent />
    </Suspense>
  );
}
