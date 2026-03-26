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

const LIMITES: Record<string, { linguas: number; concursos: number }> = {
  "professor-start": { linguas: 1, concursos: 1 },
  "professor-pro":   { linguas: 2, concursos: 2 },
  "professor-scale": { linguas: 99, concursos: 99 },
};

const LINGUAS_SUGERIDAS = [
  "Inglês", "Espanhol", "Francês", "Alemão", "Italiano",
  "Mandarim", "Japonês", "Português (avançado)", "Outro",
];

export default function ConfigurarProfessorPage() {
  const router = useRouter();
  const params = useParams();
  const plano  = params?.plano as string;

  const limites = LIMITES[plano] || { linguas: 1, concursos: 1 };
  const ilimitado = limites.linguas >= 99;

  const [linguas,    setLinguas]    = useState<string[]>([]);
  const [concursos,  setConcursos]  = useState<string[]>([]);
  const [novaLingua, setNovaLingua] = useState("");
  const [novoConcurso, setNovoConcurso] = useState("");
  const [salvando,   setSalvando]   = useState(false);
  const [erro,       setErro]       = useState("");

  function addLingua(l: string) {
    const v = l.trim();
    if (!v || linguas.includes(v)) return;
    if (!ilimitado && linguas.length >= limites.linguas) return;
    setLinguas(prev => [...prev, v]);
    setNovaLingua("");
  }

  function addConcurso() {
    const v = novoConcurso.trim();
    if (!v || concursos.includes(v)) return;
    if (!ilimitado && concursos.length >= limites.concursos) return;
    setConcursos(prev => [...prev, v]);
    setNovoConcurso("");
  }

  async function salvar() {
    if (linguas.length === 0 && concursos.length === 0) {
      setErro("Adicione ao menos uma língua ou concurso.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const res  = await fetch("/api/professor/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano, linguas, concursos }),
      });
      const data = await res.json();
      if (data.erro) { setErro(data.erro); return; }
      router.push(`/aluno/${plano}`);
    } catch {
      setErro("Erro ao salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const podeAddLingua   = ilimitado || linguas.length < limites.linguas;
  const podeAddConcurso = ilimitado || concursos.length < limites.concursos;

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <p style={{
            fontFamily: "Georgia, serif", fontSize: "1.2rem", letterSpacing: "0.25em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            marginBottom: 8,
          }}>KADOSH PROFESSOR</p>
          <p style={{ color: LABEL, fontSize: 14 }}>Configure sua jornada de estudos</p>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
            {ilimitado
              ? "Plano Scale — sem limites"
              : `Seu plano inclui ${limites.linguas} língua${limites.linguas > 1 ? "s" : ""} e ${limites.concursos} concurso${limites.concursos > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Línguas */}
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
          Língua{limites.linguas > 1 || ilimitado ? "s" : ""} estrangeira{limites.linguas > 1 || ilimitado ? "s" : ""}
        </p>

        {linguas.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {linguas.map(l => (
              <div key={l} style={{
                padding: "6px 12px", borderRadius: 20,
                background: "rgba(212,160,23,0.12)", border: `1px solid ${GOLD}`,
                color: GOLD_LIGHT, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
              }}>
                {l}
                <button onClick={() => setLinguas(prev => prev.filter(x => x !== l))}
                  style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Sugestões */}
        {podeAddLingua && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {LINGUAS_SUGERIDAS.filter(l => !linguas.includes(l)).map(l => (
                <button key={l} onClick={() => addLingua(l)}
                  style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 12,
                    border: "1px solid rgba(212,160,23,0.2)", background: CARD_BG,
                    color: LABEL, cursor: "pointer",
                  }}>
                  + {l}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={novaLingua}
                onChange={e => setNovaLingua(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addLingua(novaLingua)}
                placeholder="Outro idioma..."
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  border: "1px solid rgba(212,160,23,0.2)", background: "rgba(255,255,255,0.03)",
                  color: GOLD_LIGHT, fontSize: 13, outline: "none",
                }}
              />
              <button onClick={() => addLingua(novaLingua)}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: "none",
                  background: "rgba(212,160,23,0.15)", color: GOLD, cursor: "pointer", fontSize: 16,
                }}>+</button>
            </div>
          </div>
        )}
        {!podeAddLingua && (
          <p style={{ color: MUTED, fontSize: 11, marginBottom: 8 }}>
            Limite atingido. Faça upgrade para adicionar mais línguas.
          </p>
        )}

        <div style={{ height: 28 }} />

        {/* Concursos */}
        <p style={{ color: MUTED, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>
          Concurso{limites.concursos > 1 || ilimitado ? "s" : ""} público{limites.concursos > 1 || ilimitado ? "s" : ""}
        </p>
        <p style={{ color: MUTED, fontSize: 12, marginBottom: 12 }}>
          O professor pedirá o edital em PDF para montar o cronograma de estudos.
        </p>

        {concursos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {concursos.map(c => (
              <div key={c} style={{
                padding: "10px 14px", borderRadius: 12,
                background: "rgba(212,160,23,0.12)", border: `1px solid ${GOLD}`,
                color: GOLD_LIGHT, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                🏛️ {c}
                <button onClick={() => setConcursos(prev => prev.filter(x => x !== c))}
                  style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        )}

        {podeAddConcurso && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={novoConcurso}
              onChange={e => setNovoConcurso(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addConcurso()}
              placeholder="Ex: Brigada Militar RS, PRF, PMSP..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 10,
                border: "1px solid rgba(212,160,23,0.2)", background: "rgba(255,255,255,0.03)",
                color: GOLD_LIGHT, fontSize: 13, outline: "none",
              }}
            />
            <button onClick={addConcurso}
              style={{
                padding: "10px 16px", borderRadius: 10, border: "none",
                background: "rgba(212,160,23,0.15)", color: GOLD, cursor: "pointer", fontSize: 16,
              }}>+</button>
          </div>
        )}
        {!podeAddConcurso && (
          <p style={{ color: MUTED, fontSize: 11, marginBottom: 8 }}>
            Limite atingido. Faça upgrade para adicionar mais concursos.
          </p>
        )}

        {erro && <p style={{ color: "#e74c3c", fontSize: 12, textAlign: "center", marginTop: 12 }}>{erro}</p>}

        <div style={{ height: 32 }} />

        <button onClick={salvar} disabled={salvando}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            background: `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`,
            color: "#0A0808", fontWeight: 700, fontSize: "1rem",
            fontFamily: "Georgia, serif", letterSpacing: "0.15em",
            cursor: salvando ? "default" : "pointer",
            opacity: salvando ? 0.7 : 1,
            boxShadow: `0 0 30px rgba(212,160,23,0.4)`,
          }}>
          {salvando ? "salvando..." : "CONFIRMAR E COMEÇAR"}
        </button>

        <button onClick={() => router.push(`/aluno/${plano}`)}
          style={{
            width: "100%", marginTop: 12, padding: "12px", borderRadius: 14,
            border: "1px solid rgba(212,160,23,0.1)", background: "transparent",
            color: MUTED, fontSize: "0.8rem", fontFamily: "Georgia, serif",
            letterSpacing: "0.1em", cursor: "pointer",
          }}>
          pular por agora
        </button>

      </div>
    </main>
  );
}
