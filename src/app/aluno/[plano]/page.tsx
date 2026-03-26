"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const TEXT       = "#D8C890";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";
const CARD_BG    = "rgba(212,160,23,0.06)";
const CARD_BORDER= "rgba(212,160,23,0.25)";

// Estrutura de cada plano: o que o aluno pode acessar
const ESTRUTURA: Record<string, {
  modo: string;
  titulo: string;
  preco: string;
  descricao: string;
  modulos: { icone: string; nome: string; descricao: string; disponivel: boolean }[];
}> = {
  "professor-start": {
    modo: "Kadosh Professor",
    titulo: "Professor Start",
    preco: "R$ 97/mês",
    descricao: "Professor particular + 1 língua estrangeira + preparação para 1 concurso público.",
    modulos: [
      { icone: "🎓", nome: "Professor Particular", descricao: "Aulas por voz sobre qualquer assunto, a qualquer hora.", disponivel: true },
      { icone: "🌍", nome: "1 Língua Estrangeira", descricao: "Inglês, Espanhol ou outro idioma — aulas conversacionais por voz.", disponivel: true },
      { icone: "🏛️", nome: "1 Concurso Público", descricao: "Preparação completa com base no edital do concurso escolhido.", disponivel: true },
      { icone: "∞", nome: "Mais concursos e línguas", descricao: "Disponível nos planos Pro e Scale.", disponivel: false },
    ],
  },
  "professor-pro": {
    modo: "Kadosh Professor",
    titulo: "Professor Pro",
    preco: "R$ 147/mês",
    descricao: "Professor particular + 2 línguas estrangeiras + preparação para 2 concursos.",
    modulos: [
      { icone: "🎓", nome: "Professor Particular", descricao: "Aulas por voz sobre qualquer assunto, a qualquer hora.", disponivel: true },
      { icone: "🌍", nome: "2 Línguas Estrangeiras", descricao: "Estude dois idiomas simultaneamente com aulas por voz.", disponivel: true },
      { icone: "🏛️", nome: "2 Concursos Públicos", descricao: "Preparação para dois concursos com base nos editais enviados.", disponivel: true },
      { icone: "∞", nome: "Ilimitado", descricao: "Disponível no plano Scale.", disponivel: false },
    ],
  },
  "professor-scale": {
    modo: "Kadosh Professor",
    titulo: "Professor Scale",
    preco: "R$ 197/mês",
    descricao: "Professor particular com acesso ilimitado — línguas, concursos e assuntos sem restrição.",
    modulos: [
      { icone: "🎓", nome: "Professor Particular", descricao: "Aulas por voz sobre qualquer assunto, sem limite.", disponivel: true },
      { icone: "🌍", nome: "Línguas Ilimitadas", descricao: "Estude quantos idiomas quiser ao mesmo tempo.", disponivel: true },
      { icone: "🏛️", nome: "Concursos Ilimitados", descricao: "Preparação para quantos concursos quiser, com edital próprio para cada.", disponivel: true },
      { icone: "∞", nome: "Acesso Total", descricao: "Sem restrições de nenhum tipo.", disponivel: true },
    ],
  },
};

export default function AlunoPlanoPage() {
  const router = useRouter();
  const params = useParams();
  const plano = params?.plano as string;

  const [client,  setClient]  = useState<any>(null);
  const [config,  setConfig]  = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ehPlanoProfessor = plano?.startsWith("professor");

    fetch("/api/auth/me")
      .then(r => {
        if (r.status === 401) {
          setClient({ name: "Alessandro", plan: plano });
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        if (data.status !== "active") {
          setClient({ name: "Alessandro", plan: plano });
          setLoading(false);
          return;
        }
        setClient(data);

        // Verifica se já configurou língua/concurso
        if (ehPlanoProfessor) {
          fetch("/api/professor/config")
            .then(r => r.json())
            .then(d => {
              setConfig(d.config || null);
              setLoading(false);
            })
            .catch(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setClient({ name: "Alessandro", plan: plano });
        setLoading(false);
      });
  }, [router, plano]);

  if (loading) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: GOLD, fontFamily: "Georgia, serif", letterSpacing: "0.2em" }}>carregando...</p>
    </main>
  );

  if (!client) return null;

  const estrutura = ESTRUTURA[plano];
  if (!estrutura) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: MUTED }}>Plano não encontrado.</p>
    </main>
  );

  const primeiroNome = client.name?.split(" ")[0] || "Aluno";

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <button
            onClick={() => router.push("/aluno")}
            style={{ fontSize: 11, color: LABEL, letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}
          >
            ← PAINEL
          </button>
          <h1 style={{
            fontFamily: "Georgia, serif",
            fontSize: "1.2rem",
            letterSpacing: "0.25em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            KADOSH
          </h1>
          <div style={{ width: 60 }} />
        </div>

        {/* Saudação + plano */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: GOLD_LIGHT, fontFamily: "Georgia, serif", fontSize: "1.2rem", fontWeight: 700 }}>
            {estrutura.titulo}
          </p>
          <p style={{ color: LABEL, fontSize: 13, marginTop: 4 }}>
            {estrutura.descricao}
          </p>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{estrutura.preco}</p>
        </div>

        {/* Banner de configuração — aparece só se ainda não configurou */}
        {plano?.startsWith("professor") && !config && (
          <div
            onClick={() => router.push(`/aluno/${plano}/configurar`)}
            style={{
              padding: "16px 18px", borderRadius: 14, marginBottom: 20, cursor: "pointer",
              border: `1px solid rgba(212,160,23,0.5)`,
              background: "rgba(212,160,23,0.1)",
              display: "flex", alignItems: "center", gap: 14,
            }}
          >
            <span style={{ fontSize: 28 }}>⚙️</span>
            <div>
              <p style={{ color: GOLD_LIGHT, fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 600 }}>
                Configure sua jornada
              </p>
              <p style={{ color: LABEL, fontSize: 12, marginTop: 2 }}>
                Escolha sua língua e concurso para começar →
              </p>
            </div>
          </div>
        )}

        {/* Resumo da configuração — aparece quando já configurou */}
        {plano?.startsWith("professor") && config && (config.linguas?.length > 0 || config.concursos?.length > 0) && (
          <div style={{
            padding: "14px 18px", borderRadius: 14, marginBottom: 20,
            border: `1px solid rgba(212,160,23,0.2)`, background: "rgba(212,160,23,0.05)",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          }}>
            <div style={{ flex: 1 }}>
              {config.linguas?.length > 0 && (
                <p style={{ color: LABEL, fontSize: 12, marginBottom: 4 }}>
                  🌍 <span style={{ color: GOLD_LIGHT }}>{config.linguas.join(", ")}</span>
                </p>
              )}
              {config.concursos?.length > 0 && (
                <p style={{ color: LABEL, fontSize: 12 }}>
                  🏛️ <span style={{ color: GOLD_LIGHT }}>{config.concursos.join(", ")}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => router.push(`/aluno/${plano}/configurar`)}
              style={{ fontSize: 11, color: MUTED, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.08em" }}
            >
              editar
            </button>
          </div>
        )}

        {/* Módulos disponíveis */}
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>
          seu acesso
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {estrutura.modulos.map((mod) => (
            <div
              key={mod.nome}
              onClick={() => mod.disponivel && router.push(`/aluno/${plano}/chat`)}
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                border: `1px solid ${mod.disponivel ? CARD_BORDER : "rgba(255,255,255,0.06)"}`,
                background: mod.disponivel ? CARD_BG : "rgba(255,255,255,0.02)",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                cursor: mod.disponivel ? "pointer" : "default",
                opacity: mod.disponivel ? 1 : 0.4,
                transition: "border-color 0.2s",
              }}
            >
              <span style={{ fontSize: 22, marginTop: 2 }}>{mod.icone}</span>
              <div style={{ flex: 1 }}>
                <p style={{
                  color: mod.disponivel ? GOLD_LIGHT : TEXT,
                  fontFamily: "Georgia, serif",
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 3,
                }}>
                  {mod.nome}
                </p>
                <p style={{ color: MUTED, fontSize: 12 }}>{mod.descricao}</p>
              </div>
              {mod.disponivel && (
                <span style={{ color: GOLD, fontSize: 18, marginTop: 2 }}>›</span>
              )}
            </div>
          ))}
        </div>

        {/* Botão principal — ir para o chat com o professor */}
        <button
          onClick={() => router.push(`/aluno/${plano}/chat`)}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem",
            fontFamily: "Georgia, serif", letterSpacing: "0.15em", cursor: "pointer",
            boxShadow: `0 0 30px rgba(212,160,23,0.4)`, marginBottom: 10,
          }}
        >
          FALAR COM O PROFESSOR
        </button>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => router.push(`/aluno/${plano}/configurar`)}
            style={{
              flex: 1, padding: "13px", borderRadius: 14,
              border: `1px solid rgba(212,160,23,0.25)`, background: "rgba(212,160,23,0.06)",
              color: LABEL, fontSize: "0.8rem", fontFamily: "Georgia, serif",
              letterSpacing: "0.1em", cursor: "pointer",
            }}
          >
            ⚙️ configurar língua / concurso
          </button>
          <button
            onClick={() => router.push(`/aluno/${plano}/testar`)}
            style={{
              flex: 1, padding: "13px", borderRadius: 14,
              border: `1px solid rgba(212,160,23,0.25)`, background: "rgba(212,160,23,0.06)",
              color: LABEL, fontSize: "0.8rem", fontFamily: "Georgia, serif",
              letterSpacing: "0.1em", cursor: "pointer",
            }}
          >
            🎯 testar conhecimento
          </button>
        </div>

        {/* Upgrade */}
        {plano !== "professor-scale" && (
          <button
            onClick={() => router.push(`/assinar/professor-${plano === "professor-start" ? "pro" : "scale"}`)}
            style={{
              width: "100%", padding: "13px", marginTop: 20, borderRadius: 14,
              border: `1px solid rgba(212,160,23,0.15)`, background: "transparent",
              color: MUTED, fontSize: "0.8rem", fontFamily: "Georgia, serif",
              letterSpacing: "0.1em", cursor: "pointer",
            }}
          >
            fazer upgrade de plano
          </button>
        )}

      </div>
    </main>
  );
}
