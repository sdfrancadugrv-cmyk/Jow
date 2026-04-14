"use client";

import { useEffect, useState } from "react";

const GREEN = "#1F7A63";
const ADMIN_KEY = "valvula2024";

interface Order {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  opcao: string;
  valor: number;
  paymentId: string | null;
  status: string;
  obs: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "#f59e0b",
  pago: "#3b82f6",
  enviado: "#8b5cf6",
  cancelado: "#ef4444",
  entregue: "#22c55e",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Aguardando pagamento",
  pago: "Pago — aguardando envio",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function ValvulaAdmin() {
  const [authed, setAuthed] = useState(false);
  const [senha, setSenha] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [updating, setUpdating] = useState<string | null>(null);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch(`/api/valvula/orders?key=${ADMIN_KEY}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (senha === ADMIN_KEY || senha === "hydroblu2024") {
      setAuthed(true);
    } else {
      alert("Senha incorreta");
    }
  }

  useEffect(() => {
    if (authed) fetchOrders();
  }, [authed]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch(`/api/valvula/orders?key=${ADMIN_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await fetchOrders();
    } finally {
      setUpdating(null);
    }
  }

  // ── login ────────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 20, padding: 40, width: "100%", maxWidth: 360 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💧</div>
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>HydroBlu Admin</h1>
            <p style={{ color: "#555", fontSize: 13, marginTop: 4 }}>Painel de pedidos</p>
          </div>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Senha de acesso"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              style={{ width: "100%", background: "#0d0d0d", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#e8e8e8", outline: "none", marginBottom: 14, boxSizing: "border-box" }}
            />
            <button
              type="submit"
              style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "13px", width: "100%", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
            >
              Entrar
            </button>
          </form>
        </div>
      </main>
    );
  }

  const allStatuses = ["todos", "pendente", "pago", "enviado", "entregue", "cancelado"];
  const filtered = filter === "todos" ? orders : orders.filter(o => o.status === filter);

  const stats = {
    total: orders.length,
    pagos: orders.filter(o => o.status === "pago" || o.status === "enviado" || o.status === "entregue").length,
    receita: orders.filter(o => o.status !== "cancelado" && o.status !== "pendente").reduce((s, o) => s + o.valor, 0),
    pendentes: orders.filter(o => o.status === "pendente").length,
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e8e8", fontFamily: "'Inter', system-ui, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid #1a1a1a" }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
              Hydro<span style={{ color: GREEN }}>Blu</span> Admin
            </h1>
            <p style={{ fontSize: 12, color: "#444", marginTop: 3 }}>Gestão de pedidos</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={fetchOrders}
              style={{ background: "transparent", border: "1px solid #222", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#555", cursor: "pointer" }}
            >
              ↻ Atualizar
            </button>
            <a
              href="/valvula"
              target="_blank"
              style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
            >
              Ver página de vendas
            </a>
          </div>
        </header>

        {/* métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total de pedidos", val: stats.total, color: "#7c3aed" },
            { label: "Pedidos pagos", val: stats.pagos, color: GREEN },
            { label: "Aguardando", val: stats.pendentes, color: "#f59e0b" },
            { label: "Receita confirmada", val: `R$ ${stats.receita.toFixed(2).replace(".", ",")}`, color: "#22c55e" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.12em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* filtros */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {allStatuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                background: filter === s ? GREEN : "transparent",
                border: `1px solid ${filter === s ? GREEN : "#222"}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                color: filter === s ? "#fff" : "#555",
                cursor: "pointer",
                fontWeight: filter === s ? 700 : 400,
                textTransform: "capitalize",
              }}
            >
              {s === "todos" ? `Todos (${orders.length})` : `${STATUS_LABELS[s] || s} (${orders.filter(o => o.status === s).length})`}
            </button>
          ))}
        </div>

        {/* tabela */}
        {loading ? (
          <p style={{ color: "#333", textAlign: "center", padding: 60 }}>Carregando pedidos...</p>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p style={{ color: "#333", fontSize: 14 }}>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(order => (
              <div key={order.id} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

                  {/* info principal */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>{order.nome}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 20,
                        background: `${STATUS_COLORS[order.status] || "#888"}20`,
                        color: STATUS_COLORS[order.status] || "#888",
                        border: `1px solid ${STATUS_COLORS[order.status] || "#888"}40`,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}>📱 {order.telefone}</div>
                    <div style={{ fontSize: 13, color: "#555", marginBottom: 3 }}>📍 {order.endereco}</div>
                    <div style={{ fontSize: 12, color: "#333", marginTop: 6 }}>
                      #{order.id.slice(-6).toUpperCase()} · {new Date(order.createdAt).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  {/* produto e valor */}
                  <div style={{ textAlign: "right", minWidth: 140 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: GREEN }}>
                      R$ {order.valor.toFixed(2).replace(".", ",")}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
                      {order.opcao === "tecnico" ? "Com técnico" : "Instala ele mesmo"}
                    </div>
                    {order.paymentId && (
                      <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>
                        MP #{String(order.paymentId).slice(-6)}
                      </div>
                    )}
                  </div>

                  {/* ações */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignSelf: "center" }}>
                    <a
                      href={`https://wa.me/55${order.telefone.replace(/\D/g,"")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: "#25d366", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, textDecoration: "none" }}
                    >
                      💬 WhatsApp
                    </a>
                    {order.status === "pago" && (
                      <button
                        onClick={() => updateStatus(order.id, "enviado")}
                        disabled={updating === order.id}
                        style={{ background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: updating === order.id ? 0.6 : 1 }}
                      >
                        📦 Marcar enviado
                      </button>
                    )}
                    {order.status === "enviado" && (
                      <button
                        onClick={() => updateStatus(order.id, "entregue")}
                        disabled={updating === order.id}
                        style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: updating === order.id ? 0.6 : 1 }}
                      >
                        ✅ Marcar entregue
                      </button>
                    )}
                    {(order.status === "pendente") && (
                      <button
                        onClick={() => updateStatus(order.id, "cancelado")}
                        disabled={updating === order.id}
                        style={{ background: "transparent", border: "1px solid #2a1111", borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#7f1d1d", cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
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
