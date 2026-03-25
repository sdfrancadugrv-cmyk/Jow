"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const TEXT = "#D8C890";
const MUTED = "#7A6018";

type Provider = {
  id: string;
  name: string;
  serviceType: string;
  city: string;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  reviewCount: number;
  dailyRate: number | null;
  distance: number | null;
};

function ServiceSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("s") || "";

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      fetchProviders(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocationStatus("ok");
        fetchProviders(c);
      },
      () => {
        setLocationStatus("denied");
        fetchProviders(null);
      },
      { timeout: 6000, maximumAge: 60000 }
    );
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProviders = async (c: { lat: number; lng: number } | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("s", query);
      if (c) { params.set("lat", String(c.lat)); params.set("lng", String(c.lng)); }
      const res = await fetch(`/api/services/nearby?${params}`);
      const data = await res.json();
      setProviders(data.providers || []);
    } catch {
      setProviders([]);
    }
    setLoading(false);
  };

  const stars = (rating: number | null) => {
    const r = Math.round(rating || 0);
    return "★".repeat(r) + "☆".repeat(5 - r);
  };

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", marginBottom: 4 }}>
          KADOSH
        </h1>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 24 }}>
          Serviços Locais
        </p>

        <div style={{ marginBottom: 20 }}>
          {query ? (
            <p style={{ color: GOLD_LIGHT, fontSize: 16, fontWeight: 600 }}>
              Resultados para: <span style={{ color: GOLD }}>{query}</span>
            </p>
          ) : (
            <p style={{ color: TEXT, fontSize: 14 }}>Todos os prestadores disponíveis</p>
          )}
          {locationStatus === "ok" && (
            <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>📍 Ordenados por distância de você</p>
          )}
          {locationStatus === "denied" && (
            <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Localização não disponível — mostrando todos</p>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: MUTED, fontSize: 14 }}>Buscando prestadores...</p>
          </div>
        ) : providers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", borderRadius: 16, border: "1px solid rgba(212,160,23,0.15)", background: "rgba(212,160,23,0.04)" }}>
            <p style={{ color: TEXT, fontSize: 14, marginBottom: 8 }}>Nenhum prestador encontrado{query ? ` para "${query}"` : ""}.</p>
            <p style={{ color: MUTED, fontSize: 12 }}>Tente falar com o Kadosh para refinar a busca.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {providers.map(p => (
              <div key={p.id} onClick={() => router.push(`/services/hire/${p.id}`)} style={{ borderRadius: 16, border: "1px solid rgba(212,160,23,0.25)", background: "rgba(212,160,23,0.05)", padding: "16px 18px", cursor: "pointer", transition: "border-color 0.15s" }} onMouseEnter={e => (e.currentTarget.style.borderColor = GOLD)} onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(212,160,23,0.25)")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <p style={{ color: GOLD_LIGHT, fontSize: 15, fontWeight: 700, margin: 0 }}>{p.name.split(" ")[0]}</p>
                  {p.distance !== null && (
                    <span style={{ color: MUTED, fontSize: 12, whiteSpace: "nowrap", marginLeft: 8 }}>
                      {p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance}km`}
                    </span>
                  )}
                </div>
                <p style={{ color: TEXT, fontSize: 13, marginBottom: 6 }}>
                  {p.serviceType?.split(",").join(" · ")}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ color: GOLD, fontSize: 13 }}>{stars(p.rating)}</span>
                  <span style={{ color: MUTED, fontSize: 12 }}>({p.reviewCount} avaliações)</span>
                  {p.city && <span style={{ color: MUTED, fontSize: 12 }}>· {p.city}</span>}
                </div>
                {p.dailyRate && (
                  <p style={{ color: GOLD, fontSize: 13, marginTop: 8, fontWeight: 600 }}>
                    Diária: R${p.dailyRate.toFixed(2).replace(".", ",")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 28 }}>
          <a href="/" style={{ color: MUTED, fontSize: 12 }}>← Voltar ao Kadosh</a>
        </p>
      </div>
    </main>
  );
}

export default function ServicesNewPage() {
  return <Suspense><ServiceSearch /></Suspense>;
}
