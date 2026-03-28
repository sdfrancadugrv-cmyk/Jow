"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";
const CARD_BG    = "rgba(212,160,23,0.07)";
const CARD_BORDER= "rgba(212,160,23,0.25)";

const FORMATOS = [
  { id: "prova",    icone: "📝", nome: "Prova Oral",       descricao: "Professor faz perguntas e avalia suas respostas" },
  { id: "simulado", icone: "🎯", nome: "Simulado",          descricao: "Questões objetivas com correção imediata" },
  { id: "redacao",  icone: "✏️", nome: "Redação",           descricao: "Escreva sobre o tema e receba análise técnica" },
  { id: "trabalho", icone: "📋", nome: "Trabalho",          descricao: "Desenvolvimento aprofundado de um tema específico" },
];

interface Materia {
  id: string;
  materia: string;
  createdAt: string;
}

export default function TestarPage() {
  const router = useRouter();
  const params = useParams();
  const plano  = params?.plano as string;

  const [materias,    setMaterias]    = useState<Materia[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [formato,     setFormato]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/professor/minhas-aulas")
      .then(r => r.json())
      .then(d => { if (d.materias) setMaterias(d.materias); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleMateria(nome: string) {
    setSelecionadas(prev =>
      prev.includes(nome) ? prev.filter(m => m !== nome) : [...prev, nome]
    );
  }

  function iniciarAvaliacao() {
    if (!formato || selecionadas.length === 0) return;
    const params = new URLSearchParams({
      formato,
      materias: selecionadas.join("|"),
    });
    router.push(`/aluno/${plano}/chat?${params.toString()}`);
  }

  const pronto = selecionadas.length > 0 && formato !== null;

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button onClick={() => router.push(`/aluno/${plano}`)}
            style={{ fontSize: 11, color: LABEL, letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}>
            ← VOLTAR
          </button>
          <h1 style={{
            fontFamily: "Georgia, serif", fontSize: "1.1rem", letterSpacing: "0.25em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>TESTAR CONHECIMENTO</h1>
          <div style={{ width: 60 }} />
        </div>

        {/* Matérias estudadas */}
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
          o que você estudou
        </p>

        {loading ? (
          <p style={{ color: MUTED, fontSize: 13, textAlign: "center", padding: "24px 0" }}>carregando...</p>
        ) : materias.length === 0 ? (
          <div style={{
            padding: "24px 18px", borderRadius: 14, border: "1px solid rgba(212,160,23,0.12)",
            background: "rgba(212,160,23,0.03)", textAlign: "center", marginBottom: 28,
          }}>
            <p style={{ color: MUTED, fontSize: 13 }}>Você ainda não concluiu nenhuma aula.</p>
            <button onClick={() => router.push(`/aluno/${plano}/chat`)}
              style={{ marginTop: 12, fontSize: 12, color: GOLD, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em" }}>
              Começar a estudar →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {materias.map((m) => {
              const ativa = selecionadas.includes(m.materia);
              return (
                <div key={m.id} onClick={() => toggleMateria(m.materia)}
                  style={{
                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                    border: `1px solid ${ativa ? GOLD : CARD_BORDER}`,
                    background: ativa ? "rgba(212,160,23,0.12)" : CARD_BG,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "all 0.2s",
                  }}>
                  <div>
                    <p style={{ color: ativa ? GOLD_LIGHT : LABEL, fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 600 }}>
                      {m.materia}
                    </p>
                    <p style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                      {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: `2px solid ${ativa ? GOLD : "rgba(212,160,23,0.25)"}`,
                    background: ativa ? GOLD : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#0A0808", fontWeight: 700,
                    transition: "all 0.2s",
                  }}>
                    {ativa ? "✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Formato da avaliação */}
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
          como quer ser avaliado
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          {FORMATOS.map((f) => {
            const ativo = formato === f.id;
            return (
              <div key={f.id} onClick={() => setFormato(f.id)}
                style={{
                  padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                  border: `1px solid ${ativo ? GOLD : CARD_BORDER}`,
                  background: ativo ? "rgba(212,160,23,0.12)" : CARD_BG,
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "all 0.2s",
                }}>
                <span style={{ fontSize: 22 }}>{f.icone}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: ativo ? GOLD_LIGHT : LABEL, fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 600 }}>
                    {f.nome}
                  </p>
                  <p style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>{f.descricao}</p>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${ativo ? GOLD : "rgba(212,160,23,0.25)"}`,
                  background: ativo ? GOLD : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "#0A0808", fontWeight: 700,
                  transition: "all 0.2s",
                }}>
                  {ativo ? "✓" : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão iniciar */}
        <button onClick={iniciarAvaliacao} disabled={!pronto}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            background: pronto
              ? `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`
              : "rgba(212,160,23,0.1)",
            color: pronto ? "#0A0808" : MUTED,
            fontWeight: 700, fontSize: "1rem",
            fontFamily: "Georgia, serif", letterSpacing: "0.15em",
            cursor: pronto ? "pointer" : "default",
            boxShadow: pronto ? `0 0 30px rgba(212,160,23,0.4)` : "none",
            transition: "all 0.3s",
          }}>
          {pronto ? "INICIAR AVALIAÇÃO" : "selecione matéria e formato"}
        </button>

        {selecionadas.length > 0 && (
          <p style={{ color: LABEL, fontSize: 11, textAlign: "center", marginTop: 12 }}>
            {selecionadas.length} matéria{selecionadas.length > 1 ? "s" : ""} selecionada{selecionadas.length > 1 ? "s" : ""}
          </p>
        )}

      </div>
    </main>
  );
}
