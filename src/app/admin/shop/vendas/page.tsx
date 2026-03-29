"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BG = "#070B18"; const GOLD = "#D4A017"; const GOLD_LIGHT = "#FFE082";
const LABEL = "#A08030"; const MUTED = "#7A6018"; const GREEN = "#25D366";

const STATUS_COR: Record<string, string> = {
  pago: "#25D366",
  pendente: "#FFE082",
  cancelado: "#c0392b",
};

export default function VendasDashboard() {
  const router = useRouter();
  const [vendas, setVendas] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalPagas: 0, receitaTotal: 0, comissoesPagas: 0, totalPendentes: 0 });
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  function carregar(status: string) {
    setLoading(true);
    fetch(`/api/admin/shop/vendas?status=${status}`)
      .then(r => r.json())
      .then(d => {
        setVendas(d.vendas || []);
        setStats(d.stats || {});
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregar(filtro); }, [filtro]);

  function fmt(v: number) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
  function fmtData(d: string) {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <button onClick={() => router.push("/admin/shop")} style={{ fontSize: 11, color: LABEL, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}>← JENNIFER SHOP</button>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", color: GOLD_LIGHT, letterSpacing: "0.2em", marginTop: 6 }}>VENDAS REAIS</h1>
            <p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Pedidos registrados no banco de dados</p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Vendas Pagas", valor: stats.totalPagas, tipo: "num", cor: GREEN },
            { label: "Receita Total", valor: stats.receitaTotal, tipo: "money", cor: GOLD_LIGHT },
            { label: "Comissões Pagas", valor: stats.comissoesPagas, tipo: "money", cor: "#4A90D9" },
            { label: "Pendentes", valor: stats.totalPendentes, tipo: "num", cor: "#FFE082" },
          ].map(card => (
            <div key={card.label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 14, padding: "20px 22px" }}>
              <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>{card.label.toUpperCase()}</p>
              <p style={{ color: card.cor, fontSize: "1.6rem", fontWeight: 700 }}>
                {card.tipo === "money" ? fmt(card.valor as number) : card.valor}
              </p>
            </div>
          ))}
        </div>

        {/* Filtro */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["todos", "pago", "pendente", "cancelado"].map(s => (
            <button key={s} onClick={() => setFiltro(s)}
              style={{
                padding: "8px 16px", borderRadius: 8, border: `1px solid ${filtro === s ? GOLD : "rgba(255,255,255,0.1)"}`,
                background: filtro === s ? "rgba(212,160,23,0.15)" : "transparent",
                color: filtro === s ? GOLD_LIGHT : MUTED, fontSize: 12, cursor: "pointer", textTransform: "capitalize",
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Tabela */}
        {loading ? (
          <p style={{ color: MUTED, textAlign: "center", marginTop: 40 }}>carregando...</p>
        ) : vendas.length === 0 ? (
          <p style={{ color: MUTED, textAlign: "center", marginTop: 40 }}>Nenhuma venda encontrada.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {vendas.map((v: any) => (
              <div key={v.id} style={{
                background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.06)`,
                borderRadius: 12, padding: "14px 18px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                        background: `${STATUS_COR[v.status] || "#888"}22`,
                        color: STATUS_COR[v.status] || "#888",
                      }}>{v.status.toUpperCase()}</span>
                      <span style={{ color: MUTED, fontSize: 11 }}>{fmtData(v.createdAt)}</span>
                    </div>
                    <p style={{ color: GOLD_LIGHT, fontWeight: 600, fontSize: "0.9rem" }}>{v.produto?.nome}</p>
                    <p style={{ color: LABEL, fontSize: 12, marginTop: 2 }}>
                      {v.nomeCliente} {v.telefoneCliente ? `• ${v.telefoneCliente}` : ""}
                    </p>
                    {v.enderecoCliente && (
                      <p style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{v.enderecoCliente}</p>
                    )}
                    {v.afiliado && (
                      <p style={{ color: "#4A90D9", fontSize: 11, marginTop: 4 }}>
                        Revendedora: {v.afiliado.nome} ({v.afiliado.codigo})
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: GREEN, fontWeight: 700, fontSize: "1rem" }}>{fmt(v.valorPago)}</p>
                    {v.comissaoValor > 0 && (
                      <p style={{ color: "#4A90D9", fontSize: 11, marginTop: 2 }}>comissão: {fmt(v.comissaoValor)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
