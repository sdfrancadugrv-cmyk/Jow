"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BG = "#070B18"; const GOLD = "#D4A017"; const GOLD_LIGHT = "#FFE082";
const LABEL = "#A08030"; const MUTED = "#7A6018"; const GREEN = "#25D366";
const BORDER = "rgba(212,160,23,0.18)";

export default function SaquesAdmin() {
  const router = useRouter();
  const [saques, setSaques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState<string | null>(null);

  async function carregar() {
    const res = await fetch("/api/admin/shop/saques");
    const d = await res.json();
    setSaques(d.saques || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function marcarPago(id: string) {
    setPagando(id);
    await fetch("/api/admin/shop/saques", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await carregar();
    setPagando(null);
  }

  function copiar(texto: string) {
    navigator.clipboard.writeText(texto);
  }

  const pendentes = saques.filter(s => s.status === "pendente");
  const pagos = saques.filter(s => s.status === "pago");

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <button onClick={() => router.push("/admin/shop")} style={{ fontSize: 11, color: LABEL, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em", marginBottom: 16 }}>← JENNIFER SHOP</button>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: GOLD_LIGHT, letterSpacing: "0.2em", marginBottom: 4 }}>SAQUES DE AFILIADOS</h1>
        <p style={{ color: MUTED, fontSize: 12, marginBottom: 28 }}>Gerencie os pedidos de saque das revendedoras</p>

        {loading ? (
          <p style={{ color: MUTED, textAlign: "center" }}>Carregando...</p>
        ) : (
          <>
            {/* PENDENTES */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ color: GOLD_LIGHT, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                ⏳ PENDENTES ({pendentes.length})
              </p>
              {pendentes.length === 0 ? (
                <div style={{ background: "rgba(212,160,23,0.05)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
                  <p style={{ color: MUTED, fontSize: 13 }}>Nenhum saque pendente.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {pendentes.map(s => (
                    <div key={s.id} style={{ background: "rgba(212,160,23,0.05)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>{s.afiliado?.nome}</p>
                        <p style={{ color: MUTED, fontSize: 12, margin: "0 0 8px" }}>
                          {new Date(s.createdAt).toLocaleDateString("pt-BR")} às {new Date(s.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#ccc", fontSize: 12 }}>PIX:</span>
                          <span style={{ color: GOLD_LIGHT, fontSize: 13, fontWeight: 600 }}>{s.pixKey}</span>
                          <button onClick={() => copiar(s.pixKey)} style={{ padding: "2px 8px", borderRadius: 6, border: `1px solid ${BORDER}`, background: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>
                            Copiar
                          </button>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ color: GREEN, fontSize: "1.4rem", fontWeight: 800, margin: "0 0 8px" }}>
                          R$ {s.valor.toFixed(2).replace(".", ",")}
                        </p>
                        <button
                          onClick={() => marcarPago(s.id)}
                          disabled={pagando === s.id}
                          style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: pagando === s.id ? "#333" : GREEN, color: "#fff", fontWeight: 700, fontSize: 13, cursor: pagando === s.id ? "default" : "pointer" }}
                        >
                          {pagando === s.id ? "Aguarde..." : "✅ Marcar como Pago"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PAGOS */}
            {pagos.length > 0 && (
              <div>
                <p style={{ color: MUTED, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>✅ PAGOS ({pagos.length})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pagos.map(s => (
                    <div key={s.id} style={{ background: "rgba(37,211,102,0.04)", border: "1px solid rgba(37,211,102,0.15)", borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ color: "#ccc", fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{s.afiliado?.nome}</p>
                        <p style={{ color: MUTED, fontSize: 11, margin: 0 }}>{s.pixKey} · {new Date(s.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <p style={{ color: GREEN, fontWeight: 700, fontSize: 14 }}>R$ {s.valor.toFixed(2).replace(".", ",")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
