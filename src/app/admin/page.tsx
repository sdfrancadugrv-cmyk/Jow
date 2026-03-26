"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";

// Quais planos desbloqueiam cada item (vazio = todos desbloqueiam)
const PLANOS_PROFESSOR_START  = ["professor-start"];
const PLANOS_PROFESSOR_PRO    = ["professor-pro"];
const PLANOS_PROFESSOR_SCALE  = ["professor-scale"];
const PLANOS_VENDEDOR         = ["vendedor-starter", "vendedor-pro", "vendedor-scale"];

interface ModuloItem {
  nome: string;
  rota: string;
  icone: string;
  desc: string;
  planos: string[]; // vazio = livre para todos
}

interface Modulo {
  categoria: string;
  cor: string;
  itens: ModuloItem[];
}

const MODULOS: Modulo[] = [
  {
    categoria: "Kadosh Professor",
    cor: "#D4A017",
    itens: [
      { nome: "Professor Start",  rota: "/aluno/professor-start",  icone: "🎓", desc: "1 língua + 1 concurso",    planos: PLANOS_PROFESSOR_START },
      { nome: "Professor Pro",    rota: "/aluno/professor-pro",    icone: "🎓", desc: "2 línguas + 2 concursos",  planos: PLANOS_PROFESSOR_PRO },
      { nome: "Professor Scale",  rota: "/aluno/professor-scale",  icone: "🎓", desc: "Ilimitado",                planos: PLANOS_PROFESSOR_SCALE },
    ],
  },
  {
    categoria: "Kadosh Vendedor",
    cor: "#25D366",
    itens: [
      { nome: "Criar Produto",            rota: "/vendedor/criar",          icone: "🛍️", desc: "Cadastrar novo produto para vender",  planos: PLANOS_VENDEDOR },
      { nome: "Editar Páginas de Vendas", rota: "/vendedor/minhas-paginas", icone: "📋", desc: "Ver e editar suas páginas de vendas", planos: PLANOS_VENDEDOR },
    ],
  },
  {
    categoria: "Kadosh App",
    cor: "#4A90D9",
    itens: [
      { nome: "App Principal", rota: "/app",          icone: "🤖", desc: "AI Orchestrator com voz", planos: [] },
      { nome: "WhatsApp",      rota: "/app/whatsapp", icone: "💬", desc: "Gestão de leads",         planos: [] },
    ],
  },
];

function temAcesso(item: ModuloItem, plano: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (item.planos.length === 0) return true;
  return item.planos.includes(plano);
}

export default function AdminPage() {
  const router = useRouter();
  const [nome, setNome] = useState("...");
  const [plano, setPlano] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d?.id) { router.push("/login"); return; }
        setNome(d.name?.split(" ")[0] || "Usuário");
        setPlano(d.plan || "");
        setIsAdmin(!!d.isAdmin);
        setPronto(true);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!pronto) {
    return (
      <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: MUTED, letterSpacing: "0.15em", fontSize: 13 }}>carregando...</p>
      </main>
    );
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
              {isAdmin ? `Olá, ${nome} — acesso total liberado` : `Olá, ${nome}`}
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
              {cat.itens.map((item) => {
                const liberado = temAcesso(item, plano, isAdmin);
                return (
                  <button
                    key={item.rota}
                    onClick={() => liberado && router.push(item.rota)}
                    disabled={!liberado}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "14px 18px", borderRadius: 14,
                      border: liberado
                        ? `1px solid rgba(255,255,255,0.06)`
                        : `1px solid rgba(255,255,255,0.03)`,
                      background: liberado
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(255,255,255,0.01)",
                      cursor: liberado ? "pointer" : "not-allowed",
                      textAlign: "left",
                      transition: "border-color 0.15s",
                      opacity: liberado ? 1 : 0.45,
                    }}
                    onMouseEnter={e => { if (liberado) e.currentTarget.style.borderColor = `${cat.cor}55`; }}
                    onMouseLeave={e => { if (liberado) e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                  >
                    <span style={{ fontSize: 22, filter: liberado ? "none" : "grayscale(1)" }}>
                      {item.icone}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{
                        color: liberado ? GOLD_LIGHT : "#555",
                        fontSize: 14, fontFamily: "Georgia, serif", marginBottom: 2,
                      }}>
                        {item.nome}
                      </p>
                      <p style={{ color: liberado ? MUTED : "#333", fontSize: 12 }}>
                        {liberado ? item.desc : "Plano não inclui este módulo"}
                      </p>
                    </div>
                    <span style={{ color: liberado ? MUTED : "#333", fontSize: 16 }}>
                      {liberado ? "›" : "🔒"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      </div>
    </main>
  );
}
