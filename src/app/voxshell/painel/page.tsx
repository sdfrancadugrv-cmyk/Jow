"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AgentStats {
  totalLeads: number;
  humanModeAtivos: number;
  totalMensagens: number;
  mensagensHoje: number;
  leadsHoje: number;
}

interface Agent {
  id: string;
  name: string;
  phone: string;
  instanceId: string;
  active: boolean;
  personality: string;
  followupRules: any[];
  mediaLibrary: any[];
  createdAt: string;
  stats: AgentStats;
}

interface Totais {
  leads: number;
  mensagens: number;
  leadsHoje: number;
  humanModeAtivos: number;
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e8e8e8",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "32px 24px",
  } as React.CSSProperties,
  wrap: { maxWidth: 900, margin: "0 auto" } as React.CSSProperties,

  // header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 40,
    paddingBottom: 24,
    borderBottom: "1px solid #1a1a1a",
  } as React.CSSProperties,
  brand: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#fff",
  } as React.CSSProperties,
  brandSpan: { color: "#7c3aed" } as React.CSSProperties,
  sub: { fontSize: 12, color: "#444", marginTop: 4 } as React.CSSProperties,

  // botão primário
  btnPrimary: {
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "-0.01em",
  } as React.CSSProperties,

  // cards de métricas
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    marginBottom: 32,
  } as React.CSSProperties,
  metricCard: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 14,
    padding: "20px 16px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  metricVal: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: 6,
  } as React.CSSProperties,
  metricLabel: {
    fontSize: 10,
    color: "#444",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
  } as React.CSSProperties,

  // seção agentes
  sectionTitle: {
    fontSize: 11,
    color: "#333",
    textTransform: "uppercase" as const,
    letterSpacing: "0.18em",
    fontWeight: 700,
    marginBottom: 14,
  } as React.CSSProperties,

  // card agente
  agentCard: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 16,
    padding: "22px 24px",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 20,
  } as React.CSSProperties,
  agentDot: (active: boolean) => ({
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: active ? "#22c55e" : "#333",
    flexShrink: 0,
    boxShadow: active ? "0 0 8px rgba(34,197,94,0.5)" : "none",
  }) as React.CSSProperties,
  agentInfo: { flex: 1, minWidth: 0 } as React.CSSProperties,
  agentName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 3,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  agentPhone: { fontSize: 12, color: "#555" } as React.CSSProperties,

  // mini stats do agente
  agentStats: {
    display: "flex",
    gap: 20,
    marginRight: 16,
  } as React.CSSProperties,
  agentStat: { textAlign: "center" as const } as React.CSSProperties,
  agentStatVal: { fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1, marginBottom: 2 } as React.CSSProperties,
  agentStatLabel: { fontSize: 9, color: "#444", textTransform: "uppercase" as const, letterSpacing: "0.1em" } as React.CSSProperties,

  // badge human mode
  badgeHuman: {
    fontSize: 9,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 20,
    background: "rgba(251,191,36,0.1)",
    color: "#fbbf24",
    border: "1px solid rgba(251,191,36,0.2)",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  // botões do agente
  btnOutline: {
    background: "transparent",
    border: "1px solid #222",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12,
    color: "#555",
    cursor: "pointer",
    transition: "all 0.15s",
  } as React.CSSProperties,
  btnDanger: {
    background: "transparent",
    border: "1px solid #2a1111",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12,
    color: "#7f1d1d",
    cursor: "pointer",
  } as React.CSSProperties,

  // empty state
  empty: {
    textAlign: "center" as const,
    padding: "60px 0",
    color: "#333",
  } as React.CSSProperties,
  emptyIcon: { fontSize: 40, marginBottom: 16 } as React.CSSProperties,
  emptyText: { fontSize: 14, marginBottom: 24 } as React.CSSProperties,

  // modal overlay
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  } as React.CSSProperties,
  modal: {
    background: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 560,
    maxHeight: "80vh",
    overflowY: "auto" as const,
  } as React.CSSProperties,
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 24,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  label: { fontSize: 11, color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 6, display: "block" } as React.CSSProperties,
  input: {
    width: "100%",
    background: "#0d0d0d",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#e8e8e8",
    outline: "none",
    marginBottom: 16,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  textarea: {
    width: "100%",
    background: "#0d0d0d",
    border: "1px solid #222",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: "#e8e8e8",
    outline: "none",
    marginBottom: 16,
    resize: "vertical" as const,
    minHeight: 120,
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  } as React.CSSProperties,
  modalActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 8,
  } as React.CSSProperties,
};

export default function PainelPage() {
  const router = useRouter();
  const [data, setData] = useState<{ agents: Agent[]; totais: Totais } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPersonality, setEditPersonality] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/voxshell/painel");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function openEdit(agent: Agent) {
    setEditAgent(agent);
    setEditName(agent.name);
    setEditPersonality(agent.personality);
  }

  async function saveEdit() {
    if (!editAgent) return;
    setSaving(true);
    try {
      await fetch(`/api/whatsapp/agents/${editAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, personality: editPersonality }),
      });
      setEditAgent(null);
      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(agent: Agent) {
    setTogglingId(agent.id);
    try {
      await fetch(`/api/whatsapp/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !agent.active }),
      });
      await fetchData();
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteAgent(id: string) {
    if (!confirm("Remover este agente? As conversas serão excluídas.")) return;
    await fetch("/api/whatsapp/agents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchData();
  }

  if (loading) {
    return (
      <main style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#333", fontSize: 13, letterSpacing: "0.1em" }}>carregando...</p>
      </main>
    );
  }

  const agents = data?.agents ?? [];
  const totais = data?.totais ?? { leads: 0, mensagens: 0, leadsHoje: 0, humanModeAtivos: 0 };

  return (
    <main style={S.page}>
      <div style={S.wrap}>

        {/* Header */}
        <header style={S.header}>
          <div>
            <h1 style={S.brand}>
              Vox<span style={S.brandSpan}>Shell</span> AI
            </h1>
            <p style={S.sub}>Painel de controle — seus agentes de atendimento</p>
          </div>
          <button style={S.btnPrimary} onClick={() => router.push("/voxshell/setup")}>
            + Novo Agente
          </button>
        </header>

        {/* Métricas globais */}
        <div style={S.metricsGrid}>
          <div style={S.metricCard}>
            <div style={{ ...S.metricVal, color: "#7c3aed" }}>{totais.leads}</div>
            <div style={S.metricLabel}>Total de Leads</div>
          </div>
          <div style={S.metricCard}>
            <div style={{ ...S.metricVal, color: "#22c55e" }}>{totais.leadsHoje}</div>
            <div style={S.metricLabel}>Leads Hoje</div>
          </div>
          <div style={S.metricCard}>
            <div style={{ ...S.metricVal, color: "#60a5fa" }}>{totais.mensagens}</div>
            <div style={S.metricLabel}>Mensagens Trocadas</div>
          </div>
          <div style={S.metricCard}>
            <div style={{ ...S.metricVal, color: "#fbbf24" }}>{totais.humanModeAtivos}</div>
            <div style={S.metricLabel}>Em Atend. Humano</div>
          </div>
        </div>

        {/* Lista de agentes */}
        <p style={S.sectionTitle}>Seus Agentes ({agents.length})</p>

        {agents.length === 0 ? (
          <div style={S.empty}>
            <div style={S.emptyIcon}>🤖</div>
            <p style={S.emptyText}>Nenhum agente configurado ainda.</p>
            <button style={S.btnPrimary} onClick={() => router.push("/voxshell/setup")}>
              Criar meu primeiro agente
            </button>
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} style={S.agentCard}>

              {/* Status dot */}
              <div style={S.agentDot(agent.active)} />

              {/* Info */}
              <div style={S.agentInfo}>
                <div style={S.agentName}>{agent.name}</div>
                <div style={S.agentPhone}>
                  📱 {agent.phone}
                  {agent.stats.humanModeAtivos > 0 && (
                    <span style={{ ...S.badgeHuman, marginLeft: 10 }}>
                      {agent.stats.humanModeAtivos} humano ativo
                    </span>
                  )}
                </div>
              </div>

              {/* Mini stats */}
              <div style={S.agentStats}>
                <div style={S.agentStat}>
                  <div style={{ ...S.agentStatVal, color: "#7c3aed" }}>{agent.stats.totalLeads}</div>
                  <div style={S.agentStatLabel}>Leads</div>
                </div>
                <div style={S.agentStat}>
                  <div style={{ ...S.agentStatVal, color: "#22c55e" }}>{agent.stats.leadsHoje}</div>
                  <div style={S.agentStatLabel}>Hoje</div>
                </div>
                <div style={S.agentStat}>
                  <div style={{ ...S.agentStatVal, color: "#60a5fa" }}>{agent.stats.totalMensagens}</div>
                  <div style={S.agentStatLabel}>Msgs</div>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  style={S.btnOutline}
                  onClick={() => toggleActive(agent)}
                  disabled={togglingId === agent.id}
                >
                  {agent.active ? "⏸ Pausar" : "▶ Ativar"}
                </button>
                <button style={S.btnOutline} onClick={() => openEdit(agent)}>
                  ✏️ Editar
                </button>
                <button style={S.btnDanger} onClick={() => deleteAgent(agent.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de edição */}
      {editAgent && (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) setEditAgent(null); }}>
          <div style={S.modal}>
            <p style={S.modalTitle}>Editar — {editAgent.name}</p>

            <label style={S.label}>Nome do Agente</label>
            <input
              style={S.input}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ex: Assistente da Clínica"
            />

            <label style={S.label}>Personalidade / Prompt</label>
            <textarea
              style={S.textarea}
              value={editPersonality}
              onChange={(e) => setEditPersonality(e.target.value)}
              placeholder="Descreva como o agente deve se comportar..."
            />

            <div style={S.modalActions}>
              <button
                style={{ ...S.btnOutline, color: "#555" }}
                onClick={() => setEditAgent(null)}
              >
                Cancelar
              </button>
              <button
                style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
