"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";
const GREEN      = "#25D366";

interface Produto {
  slug: string;
  nome: string;
  preco: string;
  ativo: boolean;
  createdAt: string;
  imageLinks: string[];
}

function driveThumb(link: string): string {
  const match = link?.match(/\/d\/([\w-]+)/);
  if (!match) return "";
  return `https://lh3.googleusercontent.com/d/${match[1]}`;
}

export default function MinhasPaginasPage() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [excluindo, setExcluindo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vendedor/listar")
      .then(r => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data.erro) { setErro(data.erro); return; }
        setProdutos(data);
        setCarregando(false);
      })
      .catch(() => setErro("Erro ao carregar produtos."));
  }, [router]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://kadosh-ai.vercel.app";

  async function excluir(slug: string) {
    if (!window.confirm("Tem certeza que quer excluir esta página? Essa ação não pode ser desfeita.")) return;
    setExcluindo(slug);
    try {
      const res = await fetch(`/api/vendedor/editar/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setProdutos(prev => prev.filter(p => p.slug !== slug));
      } else {
        alert("Erro ao excluir. Tente novamente.");
      }
    } catch {
      alert("Erro de conexão.");
    }
    setExcluindo(null);
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <button
              onClick={() => router.push("/admin")}
              style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 12, letterSpacing: "0.1em", marginBottom: 6, padding: 0 }}
            >
              ← voltar
            </button>
            <h1 style={{
              fontFamily: "Georgia, serif", fontSize: "1.3rem", letterSpacing: "0.2em",
              background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              PÁGINAS DE VENDAS
            </h1>
            <p style={{ color: MUTED, fontSize: 11, marginTop: 3, letterSpacing: "0.1em" }}>
              Gerencie seus produtos criados
            </p>
          </div>
          <button
            onClick={() => router.push("/vendedor/criar")}
            style={{
              fontSize: 12, color: BG, background: GREEN, border: "none",
              borderRadius: 10, padding: "8px 14px", cursor: "pointer",
              letterSpacing: "0.08em", fontWeight: 600,
            }}
          >
            + Criar
          </button>
        </div>

        {/* Conteúdo */}
        {carregando && (
          <p style={{ color: MUTED, letterSpacing: "0.15em", fontSize: 13, textAlign: "center", marginTop: 60 }}>
            carregando...
          </p>
        )}

        {erro && (
          <p style={{ color: "#e55", fontSize: 13, textAlign: "center", marginTop: 40 }}>{erro}</p>
        )}

        {!carregando && !erro && produtos.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 16 }}>Nenhuma página criada ainda.</p>
            <button
              onClick={() => router.push("/vendedor/criar")}
              style={{
                fontSize: 13, color: BG, background: GREEN, border: "none",
                borderRadius: 12, padding: "12px 24px", cursor: "pointer",
                letterSpacing: "0.08em", fontWeight: 600,
              }}
            >
              Criar meu primeiro produto
            </button>
          </div>
        )}

        {!carregando && produtos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {produtos.map((p) => {
              const thumb = p.imageLinks?.[0] ? driveThumb(p.imageLinks[0]) : null;
              const url = `${baseUrl}/vendedor/${p.slug}`;

              return (
                <div
                  key={p.slug}
                  style={{
                    borderRadius: 14,
                    border: `1px solid rgba(255,255,255,0.06)`,
                    background: "rgba(255,255,255,0.02)",
                    overflow: "hidden",
                  }}
                >
                  {/* Thumbnail */}
                  {thumb && (
                    <div style={{ width: "100%", height: 120, overflow: "hidden" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt={p.nome}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
                      />
                    </div>
                  )}

                  <div style={{ padding: "14px 18px" }}>
                    {/* Nome e status */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <p style={{ color: GOLD_LIGHT, fontSize: 15, fontFamily: "Georgia, serif" }}>
                        {p.nome}
                      </p>
                      <span style={{
                        fontSize: 10, letterSpacing: "0.1em",
                        color: p.ativo ? GREEN : "#888",
                        background: p.ativo ? "rgba(37,211,102,0.1)" : "rgba(255,255,255,0.05)",
                        padding: "2px 8px", borderRadius: 6,
                      }}>
                        {p.ativo ? "ATIVO" : "INATIVO"}
                      </span>
                    </div>

                    <p style={{ color: GOLD, fontSize: 13, marginBottom: 10 }}>{p.preco}</p>

                    {/* Link público */}
                    <div style={{
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8, padding: "7px 10px",
                      marginBottom: 12,
                    }}>
                      <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.08em", marginBottom: 2 }}>LINK PÚBLICO</p>
                      <p style={{ color: LABEL, fontSize: 11, wordBreak: "break-all" }}>{url}</p>
                    </div>

                    {/* Ações */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => router.push(`/vendedor/${p.slug}`)}
                        style={{
                          flex: 1, fontSize: 12, color: GOLD_LIGHT,
                          background: "rgba(212,160,23,0.1)", border: `1px solid rgba(212,160,23,0.2)`,
                          borderRadius: 9, padding: "8px 0", cursor: "pointer", letterSpacing: "0.08em",
                        }}
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(url)}
                        style={{
                          flex: 1, fontSize: 12, color: "#4A90D9",
                          background: "rgba(74,144,217,0.1)", border: `1px solid rgba(74,144,217,0.2)`,
                          borderRadius: 9, padding: "8px 0", cursor: "pointer", letterSpacing: "0.08em",
                        }}
                      >
                        Copiar
                      </button>
                      <button
                        onClick={() => router.push(`/vendedor/editar/${p.slug}`)}
                        style={{
                          flex: 1, fontSize: 12, color: GREEN,
                          background: "rgba(37,211,102,0.08)", border: `1px solid rgba(37,211,102,0.2)`,
                          borderRadius: 9, padding: "8px 0", cursor: "pointer", letterSpacing: "0.08em",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(p.slug)}
                        disabled={excluindo === p.slug}
                        style={{
                          flex: 1, fontSize: 12, color: "#e55",
                          background: "rgba(238,85,85,0.08)", border: `1px solid rgba(238,85,85,0.2)`,
                          borderRadius: 9, padding: "8px 0", cursor: excluindo === p.slug ? "default" : "pointer",
                          letterSpacing: "0.08em", opacity: excluindo === p.slug ? 0.5 : 1,
                        }}
                      >
                        {excluindo === p.slug ? "..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
