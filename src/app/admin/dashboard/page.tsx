"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BG = "#070B18"; const GOLD = "#D4A017"; const GOLD_LIGHT = "#FFE082";
const LABEL = "#A08030"; const MUTED = "#7A6018"; const GREEN = "#25D366";
const BLUE = "#4A90D9";

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  function fmt(v: number) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
  function fmtData(d: string) {
    const dt = new Date(d);
    return dt.toLocaleDateString("pt-BR") + " " + dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: MUTED }}>carregando...</p>
    </main>
  );

  const c = data?.cards || {};
  const recentes = data?.vendasRecentes || [];
  const ranking = data?.produtosRanking || [];
  const afiliados = data?.rankingAfiliados || [];

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <button onClick={() => router.push("/admin")} style={{ fontSize: 11, color: LABEL, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}>← ADMIN</button>
            <h1 style={{
              fontFamily: "Georgia, serif", fontSize: "1.5rem", letterSpacing: "0.2em", marginTop: 6,
              background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>DASHBOARD</h1>
            <p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Jennifer Shop — visão geral em tempo real</p>
          </div>
          <button onClick={() => { setLoading(true); fetch("/api/admin/dashboard").then(r => r.json()).then(setData).finally(() => setLoading(false)); }}
            style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid rgba(255,255,255,0.1)`, background: "transparent", color: MUTED, fontSize: 12, cursor: "pointer" }}>
            ↻ Atualizar
          </button>
        </div>

        {/* Cards hoje / mês */}
        <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.2em", marginBottom: 10 }}>HOJE</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Card label="Vendas" valor={c.vendasHoje} tipo="num" cor={GREEN} />
          <Card label="Receita" valor={c.receitaHoje} tipo="money" cor={GOLD_LIGHT} />
        </div>

        <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.2em", marginBottom: 10 }}>ESTE MÊS</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Card label="Vendas" valor={c.vendasMes} tipo="num" cor={GREEN} />
          <Card label="Receita" valor={c.receitaMes} tipo="money" cor={GOLD_LIGHT} />
        </div>

        <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.2em", marginBottom: 10 }}>TOTAL HISTÓRICO</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 32 }}>
          <Card label="Vendas Pagas" valor={c.vendasTotal} tipo="num" cor={GREEN} />
          <Card label="Receita Total" valor={c.receitaTotal} tipo="money" cor={GOLD_LIGHT} />
          <Card label="Comissões Pagas" valor={c.comissoesTotal} tipo="money" cor={BLUE} />
          <Card label="Saques Pagos" valor={c.saquesTotal} tipo="money" cor="#c0392b" />
          <Card label="Revendedoras" valor={c.afiliadosAtivos} tipo="num" cor="#A855F7" />
        </div>

        {/* Afiliados */}
        <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.2em", marginBottom: 10 }}>AFILIADOS — LINKS & CLIQUES</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <Card label="Afiliados cadastrados" valor={c.afiliadosAtivos} tipo="num" cor="#A855F7" />
          <Card label="Cliques hoje" valor={c.cliquesHoje} tipo="num" cor={BLUE} />
          <Card label="Cliques este mês" valor={c.cliquesMes} tipo="num" cor={BLUE} />
          <Card label="Cliques totais" valor={c.totalCliques} tipo="num" cor={GOLD_LIGHT} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 32 }}>

          {/* Ranking de produtos */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
            <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.2em", marginBottom: 16 }}>TOP PRODUTOS</p>
            {ranking.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 12 }}>Nenhuma venda ainda.</p>
            ) : ranking.map((p: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <p style={{ color: GOLD_LIGHT, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nome}</p>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 4 }}>
                    <div style={{ height: "100%", borderRadius: 2, background: GOLD, width: `${Math.min(100, (p.vendas / (ranking[0]?.vendas || 1)) * 100)}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700 }}>{p.vendas}x</p>
                  <p style={{ color: MUTED, fontSize: 11 }}>{fmt(p.receita)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Ranking afiliados */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
            <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.2em", marginBottom: 16 }}>TOP AFILIADOS</p>
            {afiliados.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 12 }}>Nenhum afiliado ainda.</p>
            ) : afiliados.map((a: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <p style={{ color: GOLD_LIGHT, fontSize: 12, fontWeight: 600 }}>{a.nome}</p>
                  <p style={{ color: MUTED, fontSize: 11 }}>👆 {a.cliques} cliques · 🛍️ {a.vendas} vendas</p>
                </div>
                <p style={{ color: GREEN, fontWeight: 700, fontSize: 12 }}>R$ {(a.comissao || 0).toFixed(2).replace(".", ",")}</p>
              </div>
            ))}
          </div>

          {/* Últimas vendas */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
            <p style={{ color: MUTED, fontSize: 10, letterSpacing: "0.2em", marginBottom: 16 }}>ÚLTIMAS VENDAS</p>
            {recentes.length === 0 ? (
              <p style={{ color: MUTED, fontSize: 12 }}>Nenhuma venda ainda.</p>
            ) : recentes.map((v: any) => (
              <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <p style={{ color: GOLD_LIGHT, fontSize: 12, fontWeight: 600 }}>{v.produto?.nome}</p>
                  <p style={{ color: LABEL, fontSize: 11 }}>{v.nomeCliente}</p>
                  <p style={{ color: MUTED, fontSize: 10 }}>{fmtData(v.createdAt)}</p>
                </div>
                <p style={{ color: GREEN, fontWeight: 700, fontSize: 13 }}>{fmt(v.valorPago)}</p>
              </div>
            ))}
            <button onClick={() => router.push("/admin/shop/vendas")}
              style={{ width: "100%", marginTop: 4, padding: "8px", borderRadius: 8, border: `1px solid rgba(212,160,23,0.2)`, background: "transparent", color: LABEL, fontSize: 11, cursor: "pointer" }}>
              Ver todas as vendas →
            </button>
          </div>
        </div>

        {/* Atalhos */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Produtos", rota: "/admin/shop" },
            { label: "Vendas", rota: "/admin/shop/vendas" },
            { label: "Novo Produto", rota: "/admin/shop/novo" },
          ].map(b => (
            <button key={b.rota} onClick={() => router.push(b.rota)}
              style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid rgba(212,160,23,0.2)`, background: "rgba(212,160,23,0.05)", color: LABEL, fontSize: 12, cursor: "pointer" }}>
              {b.label}
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}

function Card({ label, valor, tipo, cor }: { label: string; valor: number; tipo: "num" | "money"; cor: string }) {
  function fmt(v: number) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 14, padding: "18px 20px" }}>
      <p style={{ color: "#555", fontSize: 11, letterSpacing: "0.1em", marginBottom: 8 }}>{label.toUpperCase()}</p>
      <p style={{ color: cor, fontSize: "1.5rem", fontWeight: 700 }}>
        {tipo === "money" ? fmt(valor) : (valor || 0)}
      </p>
    </div>
  );
}
