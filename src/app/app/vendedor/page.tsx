"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG = "#070B18";
const MUTED = "#7A6018";
const BORDER = "rgba(212,160,23,0.2)";

interface Produto {
  slug: string;
  nome: string;
  preco: string;
  ativo: boolean;
  createdAt: string;
  imageLinks: string[];
  videoLinks: string[];
}

export default function VendedorListaPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendedor/listar")
      .then(r => r.json())
      .then(data => { setProdutos(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "32px 16px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        <button onClick={() => router.push("/app")} style={{ color: MUTED, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", marginBottom: 28 }}>
          ← VOLTAR
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "Georgia, serif", fontSize: "1.4rem", letterSpacing: "0.15em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            margin: 0,
          }}>
            Minhas páginas
          </h1>
          <button
            onClick={() => router.push("/vendedor/criar")}
            style={{
              padding: "10px 22px", borderRadius: 50, border: "none",
              background: `linear-gradient(135deg, #A07010, ${GOLD})`,
              color: "#0A0808", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}
          >
            + Nova página
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: GOLD, animation: "spin 0.9s linear infinite", margin: "0 auto" }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : produtos.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Nenhuma página criada ainda.</p>
            <button
              onClick={() => router.push("/vendedor/criar")}
              style={{ padding: "14px 36px", borderRadius: 50, border: "none", background: `linear-gradient(135deg, #A07010, ${GOLD})`, color: "#0A0808", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              Criar primeira página
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {produtos.map(p => (
              <div key={p.slug} style={{
                padding: "20px 22px", borderRadius: 16,
                border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.02)",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 15, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.nome}
                    </p>
                    <p style={{ color: MUTED, fontSize: 12, margin: 0 }}>
                      {p.preco} · {p.imageLinks.length} foto(s) · {p.videoLinks.length} vídeo(s)
                    </p>
                  </div>
                  <span style={{
                    flexShrink: 0, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                    background: p.ativo ? "rgba(30,180,80,0.12)" : "rgba(255,60,40,0.1)",
                    color: p.ativo ? "#40C070" : "#FF6050",
                    border: `1px solid ${p.ativo ? "rgba(30,180,80,0.3)" : "rgba(255,60,40,0.25)"}`,
                  }}>
                    {p.ativo ? "ativo" : "inativo"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => router.push(`/app/vendedor/editar/${p.slug}`)}
                    style={{
                      padding: "8px 18px", borderRadius: 20, border: `1px solid ${BORDER}`,
                      background: "rgba(212,160,23,0.07)", color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    ✏️ Editar
                  </button>
                  <a
                    href={`/vendedor/${p.slug}`} target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: "8px 18px", borderRadius: 20, border: `1px solid ${BORDER}`,
                      background: "none", color: MUTED, fontSize: 12, fontWeight: 700,
                      textDecoration: "none", display: "inline-block",
                    }}
                  >
                    🔗 Ver página
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
