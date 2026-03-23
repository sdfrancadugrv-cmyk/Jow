"use client";

import { useEffect, useState } from "react";

interface Conversation {
  id: string;
  contact: string;
  humanMode: boolean;
  updatedAt: string;
  messages: any[];
  agent: { name: string };
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function WhatsappPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/whatsapp/conversations");
    if (res.ok) setConversations(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function toggleHumanMode(id: string, current: boolean) {
    setToggling(id);
    await fetch("/api/whatsapp/human-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: id, humanMode: !current }),
    });
    await load();
    setToggling(null);
  }

  function getLastMessage(messages: any[]) {
    if (!messages?.length) return "Sem mensagens";
    const last = messages[messages.length - 1];
    const content = typeof last.content === "string" ? last.content : "[mídia]";
    return content.slice(0, 60) + (content.length > 60 ? "…" : "");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Conversas WhatsApp</h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
            Toque no botão para pausar/reativar o bot por lead
          </p>
        </div>
        <a href="/app" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>← Voltar</a>
      </div>

      {/* Lista */}
      <div style={{ padding: "8px 0" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "#666", padding: 40 }}>Carregando...</p>
        ) : conversations.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666", padding: 40 }}>Nenhuma conversa ainda.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #1a1a2e",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: c.humanMode ? "#1a0a0a" : "transparent",
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: c.humanMode ? "#7c2d2d" : "#1e3a5f",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
              }}>
                {c.humanMode ? "👤" : "🤖"}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{formatPhone(c.contact)}</span>
                  <span style={{ fontSize: 11, color: "#666" }}>{timeAgo(c.updatedAt)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {getLastMessage(c.messages)}
                </div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{c.agent.name}</div>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggleHumanMode(c.id, c.humanMode)}
                disabled={toggling === c.id}
                style={{
                  flexShrink: 0,
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: "none",
                  cursor: toggling === c.id ? "wait" : "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  background: c.humanMode ? "#16a34a" : "#dc2626",
                  color: "#fff",
                  opacity: toggling === c.id ? 0.6 : 1,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {toggling === c.id ? "..." : c.humanMode ? "Reativar bot" : "Pausar bot"}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Legenda */}
      <div style={{ padding: "16px", color: "#555", fontSize: 12, borderTop: "1px solid #1a1a2e", marginTop: 8 }}>
        <div style={{ marginBottom: 6 }}>🤖 <strong style={{ color: "#888" }}>Bot ativo</strong> — respondendo automaticamente</div>
        <div>👤 <strong style={{ color: "#888" }}>Você no controle</strong> — bot pausado, você atende</div>
      </div>
    </div>
  );
}
