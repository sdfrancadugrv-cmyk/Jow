"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";

const MODULOS = [
  {
    categoria: "Kadosh Professor",
    cor: "#D4A017",
    itens: [
      { nome: "Professor Start",  rota: "/aluno/professor-start",  icone: "🎓", desc: "1 língua + 1 concurso" },
      { nome: "Professor Pro",    rota: "/aluno/professor-pro",    icone: "🎓", desc: "2 línguas + 2 concursos" },
      { nome: "Professor Scale",  rota: "/aluno/professor-scale",  icone: "🎓", desc: "Ilimitado" },
    ],
  },
  {
    categoria: "Kadosh Vendedor",
    cor: "#25D366",
    itens: [
      { nome: "Criar Produto",  rota: "/vendedor/criar", icone: "🛍️", desc: "Cadastrar novo produto para vender" },
    ],
  },
  {
    categoria: "Kadosh App (Orchestrator)",
    cor: "#4A90D9",
    itens: [
      { nome: "App Principal", rota: "/app",          icone: "🤖", desc: "AI Orchestrator com voz" },
      { nome: "WhatsApp",      rota: "/app/whatsapp", icone: "💬", desc: "Gestão de leads" },
    ],
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [nome, setNome] = useState("Admin");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d.isAdmin) { router.push("/login"); return; }
        setNome(d.name?.split(" ")[0] || "Admin");
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <main style={{ minHeight: "100vh", background: BG, padding: "24px 16px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{
              fontFamily: "Georgia, serif", fontSize: "1.4rem", letterSpacing: "0.25em",
              background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              KADOSH ADMIN
            </h1>
            <p style={{ color: MUTED, fontSize: 11, marginTop: 3, letterSpacing: "0.1em" }}>
              Olá, {nome} — acesso total liberado
            </p>
          </div>
          <button onClick={sair} style={{ fontSize: 11, color: LABEL, letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}>
            SAIR
          </button>
        </div>

        {/* Módulos */}
        {MODULOS.map((cat) => (
          <div key={cat.categoria} style={{ marginBottom: 28 }}>
            <p style={{
              fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
              color: cat.cor, marginBottom: 10, opacity: 0.8,
            }}>
              {cat.categoria}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cat.itens.map((item) => (
                <button
                  key={item.rota}
                  onClick={() => router.push(item.rota)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 18px", borderRadius: 14, border: `1px solid rgba(255,255,255,0.06)`,
                    background: "rgba(255,255,255,0.02)", cursor: "pointer",
                    textAlign: "left", transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${cat.cor}55`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")}
                >
                  <span style={{ fontSize: 22 }}>{item.icone}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: GOLD_LIGHT, fontSize: 14, fontFamily: "Georgia, serif", marginBottom: 2 }}>
                      {item.nome}
                    </p>
                    <p style={{ color: MUTED, fontSize: 12 }}>{item.desc}</p>
                  </div>
                  <span style={{ color: MUTED, fontSize: 16 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        ))}

      </div>
    </main>
  );
}
