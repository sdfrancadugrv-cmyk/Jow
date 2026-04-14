"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3;

const NICHOS = [
  { id: "clinica", label: "Clínica / Saúde", emoji: "🏥" },
  { id: "restaurante", label: "Restaurante / Delivery", emoji: "🍕" },
  { id: "estetica", label: "Estética / Beleza", emoji: "💅" },
  { id: "juridico", label: "Advocacia / Jurídico", emoji: "⚖️" },
  { id: "imoveis", label: "Imóveis", emoji: "🏠" },
  { id: "educacao", label: "Educação / Cursos", emoji: "📚" },
  { id: "servicos", label: "Serviços Gerais", emoji: "🔧" },
  { id: "outro", label: "Outro", emoji: "✨" },
];

const PROMPTS_EXEMPLO: Record<string, string> = {
  clinica: `Você é a assistente virtual da Clínica [NOME]. Seu objetivo é atender pacientes com simpatia, tirar dúvidas sobre os serviços, verificar disponibilidade e agendar consultas. Sempre pergunte o nome do paciente no início. Não forneça diagnósticos médicos. Quando o paciente quiser agendar, pergunte qual especialidade e data preferida.`,
  restaurante: `Você é o atendente virtual do [NOME]. Responda com simpatia sobre cardápio, horários de funcionamento e delivery. Anote pedidos quando solicitado. Informe o tempo médio de entrega (45 minutos). Pergunte sempre o endereço para entrega.`,
  estetica: `Você é a recepcionista virtual do salão [NOME]. Atenda com carinho, informe sobre os serviços disponíveis e preços, e agende horários. Pergunte o nome da cliente e o serviço desejado para verificar disponibilidade.`,
  juridico: `Você é a assistente virtual do escritório [NOME]. Receba clientes com profissionalismo, identifique a área do problema jurídico e agende uma consulta inicial. Não forneça orientação jurídica diretamente — apenas acolha e encaminhe para a consulta.`,
  imoveis: `Você é o assistente de vendas da imobiliária [NOME]. Identifique o interesse do cliente (compra, venda ou aluguel), o tipo de imóvel desejado e a faixa de preço. Agende visitas quando houver interesse concreto.`,
  educacao: `Você é o atendente virtual de [NOME]. Apresente os cursos disponíveis, responda dúvidas sobre conteúdo, duração e valores. Colete o contato do interessado para que um consultor faça o follow-up.`,
  servicos: `Você é o assistente virtual de [NOME]. Atenda pedidos de serviço com simpatia, colete o problema descrito pelo cliente, endereço e disponibilidade de horário para enviar um técnico.`,
  outro: `Você é o assistente virtual de [NOME]. Atenda os clientes com simpatia, responda perguntas sobre os serviços e colete informações de contato para que a equipe possa dar continuidade ao atendimento.`,
};

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1
  const [nomeNegocio, setNomeNegocio] = useState("");
  const [nicho, setNicho] = useState("");

  // Step 2
  const [personality, setPersonality] = useState("");
  const [followups, setFollowups] = useState([
    { horas: 2, mensagem: "Oi! Vi que você não respondeu. Ainda posso te ajudar? 😊" },
  ]);
  const [medias, setMedias] = useState<{ url: string; tipo: string; gatilho: string; legenda: string }[]>([]);

  // Step 3
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [phone, setPhone] = useState("");

  function handleNichoSelect(id: string) {
    setNicho(id);
    const base = PROMPTS_EXEMPLO[id] || PROMPTS_EXEMPLO.outro;
    setPersonality(base.replace("[NOME]", nomeNegocio || "meu negócio"));
  }

  function addFollowup() {
    setFollowups([...followups, { horas: 24, mensagem: "" }]);
  }
  function removeFollowup(i: number) {
    setFollowups(followups.filter((_, idx) => idx !== i));
  }
  function updateFollowup(i: number, field: "horas" | "mensagem", val: string | number) {
    const next = [...followups];
    (next[i] as any)[field] = val;
    setFollowups(next);
  }

  function addMedia() {
    setMedias([...medias, { url: "", tipo: "imagem", gatilho: "", legenda: "" }]);
  }
  function removeMedia(i: number) {
    setMedias(medias.filter((_, idx) => idx !== i));
  }
  function updateMedia(i: number, field: string, val: string) {
    const next = [...medias];
    (next[i] as any)[field] = val;
    setMedias(next);
  }

  async function handleFinalizar() {
    if (!instanceId || !token || !phone) {
      setError("Preencha todos os campos do WhatsApp.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/whatsapp/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId,
          token,
          phone,
          name: nomeNegocio,
          personality,
          followupRules: followups,
          mediaLibrary: medias,
        }),
      });
      if (!res.ok) throw new Error("Erro ao criar agente");
      router.push("/voxshell/painel");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a1a2e", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>VoxShell AI</div>
          <div style={{ fontSize: 11, color: "#555" }}>Configuração do seu agente</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: "16px 24px 0", display: "flex", gap: 8 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? "#6366f1" : "#1e1e2e", transition: "background 0.3s" }} />
        ))}
      </div>
      <div style={{ padding: "8px 24px 0", display: "flex", gap: 8 }}>
        {["Seu negócio", "Configure o agente", "Conecte o WhatsApp"].map((label, i) => (
          <div key={i} style={{ flex: 1, fontSize: 10, color: i + 1 <= step ? "#6366f1" : "#333", fontWeight: i + 1 === step ? 700 : 400, textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 580, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Qual é o seu negócio?</h2>
              <p style={{ color: "#555", fontSize: 13 }}>Vamos configurar tudo automaticamente com base no seu nicho.</p>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Nome do negócio</label>
              <input
                value={nomeNegocio}
                onChange={e => setNomeNegocio(e.target.value)}
                placeholder="Ex: Clínica Saúde Total"
                style={{ width: "100%", background: "#111", border: "1px solid #1e1e2e", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none" }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Qual é o seu segmento?</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {NICHOS.map(n => (
                  <button key={n.id} onClick={() => handleNichoSelect(n.id)}
                    style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${nicho === n.id ? "#6366f1" : "#1e1e2e"}`, background: nicho === n.id ? "rgba(99,102,241,0.1)" : "#111", color: nicho === n.id ? "#818cf8" : "#666", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
                    <span>{n.emoji}</span> {n.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!nomeNegocio || !nicho}
              style={{ padding: "14px", borderRadius: 12, background: !nomeNegocio || !nicho ? "#1e1e2e" : "#6366f1", color: !nomeNegocio || !nicho ? "#333" : "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: !nomeNegocio || !nicho ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
              Continuar →
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Configure seu agente</h2>
              <p style={{ color: "#555", fontSize: 13 }}>Editamos o prompt pra você. Ajuste como quiser.</p>
            </div>

            {/* Prompt */}
            <div>
              <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>Prompt do agente</label>
              <textarea
                value={personality}
                onChange={e => setPersonality(e.target.value)}
                rows={6}
                style={{ width: "100%", background: "#111", border: "1px solid #1e1e2e", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6 }}
              />
              <p style={{ fontSize: 11, color: "#333", marginTop: 4 }}>Dica: escreva em linguagem natural. O agente vai seguir essas instruções.</p>
            </div>

            {/* Followup rules */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Followup automático</label>
                <button onClick={addFollowup} style={{ fontSize: 11, color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>+ Adicionar</button>
              </div>
              {followups.map((f, i) => (
                <div key={i} style={{ background: "#111", border: "1px solid #1e1e2e", borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: "#555" }}>Após</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input type="number" value={f.horas} onChange={e => updateFollowup(i, "horas", Number(e.target.value))}
                        style={{ width: 48, background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 6, padding: "4px 6px", color: "#6366f1", fontSize: 13, fontWeight: 700, outline: "none" }} />
                      <span style={{ fontSize: 11, color: "#555" }}>h</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>Mensagem</span>
                    <input value={f.mensagem} onChange={e => updateFollowup(i, "mensagem", e.target.value)}
                      placeholder="Ex: Oi! Posso te ajudar com algo? 😊"
                      style={{ width: "100%", background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
                  </div>
                  <button onClick={() => removeFollowup(i)} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 16, marginTop: 16 }}>✕</button>
                </div>
              ))}
            </div>

            {/* Media library */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>Mídias (prova social, fotos, vídeos)</label>
                <button onClick={addMedia} style={{ fontSize: 11, color: "#6366f1", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>+ Adicionar</button>
              </div>
              {medias.length === 0 && (
                <p style={{ fontSize: 12, color: "#333", padding: "10px 0" }}>Nenhuma mídia. Adicione fotos ou vídeos que o agente pode enviar durante a conversa.</p>
              )}
              {medias.map((m, i) => (
                <div key={i} style={{ background: "#111", border: "1px solid #1e1e2e", borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>URL da mídia</span>
                      <input value={m.url} onChange={e => updateMedia(i, "url", e.target.value)}
                        placeholder="https://... (link da imagem/vídeo)"
                        style={{ width: "100%", background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
                    </div>
                    <button onClick={() => removeMedia(i)} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 16, marginTop: 16, flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>Quando enviar (gatilho)</span>
                      <input value={m.gatilho} onChange={e => updateMedia(i, "gatilho", e.target.value)}
                        placeholder="Ex: quando perguntar resultado"
                        style={{ width: "100%", background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#555", display: "block", marginBottom: 4 }}>Legenda</span>
                      <input value={m.legenda} onChange={e => updateMedia(i, "legenda", e.target.value)}
                        placeholder="Ex: Resultado do nosso cliente!"
                        style={{ width: "100%", background: "#0a0a0f", border: "1px solid #1e1e2e", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#111", border: "1px solid #1e1e2e", color: "#666", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Voltar</button>
              <button onClick={() => setStep(3)} disabled={!personality}
                style={{ flex: 2, padding: "13px", borderRadius: 12, background: !personality ? "#1e1e2e" : "#6366f1", color: !personality ? "#333" : "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: !personality ? "not-allowed" : "pointer" }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Conecte o WhatsApp</h2>
              <p style={{ color: "#555", fontSize: 13 }}>Use sua conta Z-API. O agente vai atender pelo número que você conectar.</p>
            </div>

            <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, marginBottom: 6 }}>💡 Como pegar as credenciais</p>
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>
                1. Acesse <strong style={{ color: "#818cf8" }}>app.z-api.io</strong><br />
                2. Crie ou abra sua instância<br />
                3. Copie o <strong style={{ color: "#818cf8" }}>Instance ID</strong> e o <strong style={{ color: "#818cf8" }}>Token</strong>
              </p>
            </div>

            {[
              { label: "Instance ID", val: instanceId, set: setInstanceId, placeholder: "Ex: 3C1A2B3C4D5E" },
              { label: "Token", val: token, set: setToken, placeholder: "Ex: F1a2b3c4d5e6f7g8..." },
              { label: "Número do WhatsApp (com DDI)", val: phone, set: setPhone, placeholder: "Ex: 5553999990000" },
            ].map(field => (
              <div key={field.label}>
                <label style={{ fontSize: 12, color: "#888", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em" }}>{field.label}</label>
                <input value={field.val} onChange={e => field.set(e.target.value)} placeholder={field.placeholder}
                  style={{ width: "100%", background: "#111", border: "1px solid #1e1e2e", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none" }} />
              </div>
            ))}

            {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "#111", border: "1px solid #1e1e2e", color: "#666", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Voltar</button>
              <button onClick={handleFinalizar} disabled={loading}
                style={{ flex: 2, padding: "13px", borderRadius: 12, background: loading ? "#1e1e2e" : "#22c55e", color: loading ? "#333" : "#000", fontWeight: 800, fontSize: 14, border: "none", cursor: loading ? "wait" : "pointer" }}>
                {loading ? "Criando agente..." : "🚀 Ativar agente"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
