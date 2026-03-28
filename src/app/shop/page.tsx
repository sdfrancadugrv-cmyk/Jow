"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const AZUL = "#3483FA"; const BG = "#F5F5F5"; const BORDA = "#e5e5e5"; const CINZA = "#666";

function ShopContent() {
  const searchParams = useSearchParams();
  const ref = searchParams?.get("ref") || "";
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shop/produtos")
      .then(r => r.json())
      .then(d => setProdutos(d.produtos || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "Arial, sans-serif" }}>
      <div style={{ background: AZUL, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>Jennifer Shop</div>
        <div style={{ flex: 1 }} />
        <a href="/revendedor" style={{ color: "#fff", fontSize: 13, textDecoration: "none", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, padding: "6px 12px" }}>Seja revendedora</a>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ color: "#333", fontSize: "1.2rem", fontWeight: 700, marginBottom: 20 }}>
          {ref ? "Produtos especiais para você 🎁" : "Todos os produtos"}
        </h1>

        {loading ? (
          <p style={{ color: CINZA, textAlign: "center", marginTop: 40 }}>Carregando produtos...</p>
        ) : produtos.length === 0 ? (
          <p style={{ color: CINZA, textAlign: "center", marginTop: 40 }}>Nenhum produto disponível no momento.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {produtos.map((p: any) => (
              <a key={p.id} href={`/shop/${p.slug}${ref ? `?ref=${ref}` : ""}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", borderRadius: 8, border: `1px solid ${BORDA}`, overflow: "hidden", transition: "box-shadow 0.2s", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                  <div style={{ aspectRatio: "1/1", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {p.fotos?.[0] ? <img src={p.fotos[0]} alt={p.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 40 }}>🛍️</span>}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <p style={{ color: "#333", fontSize: 13, lineHeight: 1.4, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.nome}</p>
                    <p style={{ color: "#333", fontWeight: 700, fontSize: "1rem" }}>R$ {p.precoVenda?.toFixed(2).replace(".", ",")}</p>
                    <p style={{ color: "#00A650", fontSize: 12, marginTop: 4 }}>✓ {p.comissaoPorc}% de comissão</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#666" }}>Carregando...</p></main>}>
      <ShopContent />
    </Suspense>
  );
}
