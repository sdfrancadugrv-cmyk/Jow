"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";

// Planos que pertencem a cada modo
const PLANOS_PROFESSOR = ["professor-start", "professor-pro", "professor-scale"];
const PLANOS_VENDEDOR  = ["vendedor-starter", "vendedor-pro", "vendedor-scale"];

interface ModuloItem {
  nome: string;
  rota: string;
  icone: string;
  desc: string;
  /** Planos que têm acesso. Vazio = todos. */
  planos?: string[];
}

interface Modulo {
  categoria: string;
  cor: string;
  /** Planos que têm acesso à categoria. Vazio = todos. */
  planos?: string[];
  itens: ModuloItem[];
}

const MODULOS: Modulo[] = [
  {
    categoria: "Kadosh Professor",
    cor: "#D4A017",
    planos: PLANOS_PROFESSOR,
    itens: [
      { nome: "Professor Start",  rota: "/aluno/professor-start",  icone: "🎓", desc: "1 língua + 1 concurso",       planos: ["professor-start"] },
      { nome: "Professor Pro",    rota: "/aluno/professor-pro",    icone: "🎓", desc: "2 línguas + 2 concursos",    planos: ["professor-pro"] },
      { nome: "Professor Scale",  rota: "/aluno/professor-scale",  icone: "🎓", desc: "Ilimitado",                  planos: ["professor-scale"] },
    ],
  },
  {
    categoria: "Kadosh Vendedor",
    cor: "#25D366",
    planos: PLANOS_VENDEDOR,
    itens: [
      { nome: "Criar Produto",           rota: "/vendedor/criar",          icone: "🛍️", desc: "Cadastrar novo produto para vender",   planos: PLANOS_VENDEDOR },
      { nome: "Editar Páginas de Vendas", rota: "/vendedor/minhas-paginas", icone: "📋", desc: "Ver e editar suas páginas de vendas",  planos: PLANOS_VENDEDOR },
    ],
  },
  {
    categoria: "Kadosh App",
    cor: "#4A90D9",
    itens: [
      { nome: "App Principal", rota: "/app",          icone: "🤖", desc: "AI Orchestrator com voz" },
      { nome: "WhatsApp",      rota: "/app/whatsapp", icone: "💬", desc: "Gestão de leads" },
    ],
  },
];

function podeVerCategoria(cat: Modulo, plano: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!cat.planos || cat.planos.length === 0) return true;
  return cat.planos.includes(plano);
}

function podeVerItem(item: ModuloItem, plano: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  if (!item.planos || item.planos.length === 0) return true;
  return item.planos.includes(plano);
}

export default function AdminPage() {
  const router = useRouter();
  const [nome, setNome] = useState("...");
  const [plano, setPlano] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d.id) { router.push("/login"); return; }
        setNome(d.name?.split(" ")[0] || "Usuário");
        setPlano(d.plan || "");
        setIsAdmin(!!d.isAdmin);
        setCarregando(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (carregando) {
    return (
      <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: MUTED, letterSpacing: "0.15em", fontSize: 13 }}>carregando...</p>
      </main>
    );
  }

  const modulosVisiveis = MODULOS
    .filter(cat => podeVerCategoria(cat, plano, isAdmin))
    .map(cat => ({
      ...cat,
      itens: cat.itens.filter(item => podeVerItem(item, plano, isAdmin)),
    }))
    .filter(cat => cat.itens.length > 0);

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
              KADOSH
            </h1>
            <p style={{ color: MUTED, fontSize: 11, marginTop: 3, letterSpacing: "0.1em" }}>
              {isAdmin
                ? `Olá, ${nome} — acesso total liberado`
                : `Olá, ${nome} — plano ${plano || "ativo"}`}
            </p>
          </div>
          <button onClick={sair} style={{ fontSize: 11, color: LABEL, letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}>
            SAIR
          </button>
        </div>

        {/* Módulos filtrados por plano */}
        {modulosVisiveis.map((cat) => (
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
