"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Pedido {
  id: string;
  produtoSlug: string;
  nome: string;
  telefone: string;
  endereco: string;
  valor: string;
  status: string;
  afiliadoId: string | null;
  obs: string | null;
  createdAt: string;
}

const STATUS_INFO: Record<string, { label: string; cor: string; bg: string }> = {
  aguardando: { label: "Aguardando pagamento", cor: "#E8C040", bg: "rgba(232,192,64,0.12)" },
  pago:       { label: "Pago",                 cor: "#4CAF50", bg: "rgba(76,175,80,0.12)" },
  agendado:   { label: "Agendado",             cor: "#4A90D9", bg: "rgba(74,144,217,0.12)" },
  instalado:  { label: "Instalado",            cor: "#9C27B0", bg: "rgba(156,39,176,0.12)" },
  cancelado:  { label: "Cancelado",            cor: "#e74c3c", bg: "rgba(231,76,60,0.12)" },
};

const GOLD = "#D4A017"; const BG = "#070B18"; const BORDER = "rgba(212,160,23,0.18)"; const MUTED = "#7A6018"; const SURFACE = "rgba(212,160,23,0.05)";

export default function PedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [obs, setObs] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    const res = await fetch("/api/admin/pedidos");
    if (res.status === 401) { router.push("/login"); return; }
    const d = await res.json();
    setPedidos(d.pedidos || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { carregar(); }, [carregar]);

  async function atualizarStatus(id: string, status: string) {
    setAtualizando(id);
    await fetch(`/api/admin/pedidos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, obs: obs[id] }),
    });
    await carregar();
    setAtualizando(null);
    setExpandido(null);
  }

  const filtrados = filtro === "todos" ? pedidos : pedidos.filter(p => p.status === filtro);
  const contagens = Object.fromEntries(Object.keys(STATUS_INFO).map(s => [s, pedidos.filter(p => p.status === s).length]));

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: GOLD, animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "'Inter', system-ui, sans-serif", color: "#C8B070", paddingBottom: 60 }}>
      <style>{`* { box-sizing: border-box; } @keyframes spin{to{transform:rotate(360deg)}} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${GOLD}40;border-radius:4px}`}</style>

      {/* Header */}
      <div style={{ background: `${BG}F2`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${BORDER}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => router.push("/admin")} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 12, padding: 0 }}>← Admin</button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 15 }}>Pedidos de Instalação</p>
          <p style={{ margin: 0, color: MUTED, fontSize: 11 }}>{pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} no total</p>
        </div>
        <button onClick={carregar} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: GOLD, fontSize: 11, padding: "6px 12px", cursor: "pointer" }}>↻ Atualizar</button>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>

        {/* Resumo */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 24 }}>
          {[{ key: "todos", label: "Todos", count: pedidos.length, cor: GOLD }, ...Object.entries(STATUS_INFO).map(([k, v]) => ({ key: k, label: v.label.split(" ")[0], count: contagens[k] || 0, cor: v.cor }))].map(s => (
            <button key={s.key} onClick={() => setFiltro(s.key)} style={{ padding: "12px 8px", borderRadius: 12, border: `1px solid ${filtro === s.key ? s.cor + "88" : BORDER}`, background: filtro === s.key ? s.cor + "18" : SURFACE, cursor: "pointer", textAlign: "center" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: filtro === s.key ? s.cor : "#fff" }}>{s.count}</div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{s.label}</div>
            </button>
          ))}
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, border: `1px solid ${BORDER}`, borderRadius: 16, background: SURFACE }}>
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Nenhum pedido {filtro !== "todos" ? `com status "${STATUS_INFO[filtro]?.label}"` : "ainda"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtrados.map(p => {
              const si = STATUS_INFO[p.status] || STATUS_INFO.aguardando;
              const aberto = expandido === p.id;
              return (
                <div key={p.id} style={{ border: `1px solid ${aberto ? GOLD + "44" : BORDER}`, borderRadius: 16, background: SURFACE, overflow: "hidden" }}>
                  {/* Cabeçalho do card */}
                  <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setExpandido(aberto ? null : p.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 14 }}>{p.nome}</p>
                        <span style={{ fontSize: 10, fontWeight: 700, color: si.cor, padding: "3px 8px", borderRadius: 20, background: si.bg, border: `1px solid ${si.cor}44`, whiteSpace: "nowrap" }}>{si.label}</span>
                        {p.afiliadoId && <span style={{ fontSize: 10, color: GOLD, padding: "3px 8px", borderRadius: 20, background: `${GOLD}18`, border: `1px solid ${GOLD}44` }}>via Revendedor</span>}
                      </div>
                      <p style={{ margin: 0, color: MUTED, fontSize: 12 }}>
                        📱 {p.telefone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")} · 📍 {p.endereco.length > 40 ? p.endereco.slice(0, 40) + "…" : p.endereco}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: 0, color: GOLD, fontWeight: 800, fontSize: 13 }}>{p.valor}</p>
                      <p style={{ margin: 0, color: MUTED, fontSize: 10 }}>{new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                    </div>
                    <span style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>{aberto ? "▲" : "▼"}</span>
                  </div>

                  {/* Painel expandido */}
                  {aberto && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "16px 18px", background: "rgba(0,0,0,0.2)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                        {[["Pedido #", p.id.slice(-6).toUpperCase()], ["Nome", p.nome], ["Telefone", p.telefone], ["Endereço", p.endereco], ["Valor", p.valor], ["Data", new Date(p.createdAt).toLocaleString("pt-BR")]].map(([k, v]) => (
                          <div key={k} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}` }}>
                            <p style={{ margin: 0, color: MUTED, fontSize: 10, marginBottom: 3 }}>{k}</p>
                            <p style={{ margin: 0, color: "#fff", fontSize: 13 }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      {p.obs && (
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, marginBottom: 16 }}>
                          <p style={{ margin: 0, color: MUTED, fontSize: 10, marginBottom: 3 }}>Observação</p>
                          <p style={{ margin: 0, color: "#fff", fontSize: 13 }}>{p.obs}</p>
                        </div>
                      )}

                      <textarea
                        placeholder="Observação (opcional)"
                        value={obs[p.id] || ""}
                        onChange={e => setObs(prev => ({ ...prev, [p.id]: e.target.value }))}
                        rows={2}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: 13, outline: "none", resize: "vertical", marginBottom: 12, fontFamily: "inherit" }}
                      />

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {Object.entries(STATUS_INFO).filter(([k]) => k !== p.status).map(([k, v]) => (
                          <button key={k} onClick={() => atualizarStatus(p.id, k)} disabled={atualizando === p.id} style={{ padding: "9px 14px", borderRadius: 10, border: `1px solid ${v.cor}55`, background: v.bg, color: v.cor, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: atualizando === p.id ? 0.5 : 1 }}>
                            {atualizando === p.id ? "…" : `→ ${v.label}`}
                          </button>
                        ))}
                        <a href={`https://wa.me/${p.telefone}`} target="_blank" rel="noopener noreferrer" style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(37,211,102,0.4)", background: "rgba(37,211,102,0.1)", color: "#25D366", fontSize: 12, fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                          💬 WhatsApp cliente
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
