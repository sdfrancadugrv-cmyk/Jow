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
      { nome: "Criar Produto",            rota: "/vendedor/criar",          icone: "🛍️", desc: "Cadastrar novo produto para vender" },
      { nome: "Editar Páginas de Vendas", rota: "/vendedor/minhas-paginas", icone: "📋", desc: "Ver e editar suas páginas de vendas" },
      { nome: "Pedidos de Instalação",    rota: "/admin/pedidos",           icone: "📦", desc: "Ver e gerenciar pedidos recebidos" },
    ],
  },
  {
    categoria: "Kadosh App (Orchestrator)",
    cor: "#4A90D9",
    itens: [
      { nome: "WhatsApp", rota: "/app/whatsapp", icone: "💬", desc: "Gestão de leads" },
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

        {/* Dashboard — botão destaque */}
        <button
          onClick={() => router.push("/admin/dashboard")}
          style={{
            width: "100%", marginBottom: 16, padding: "20px 24px", borderRadius: 16,
            border: "2px solid #25D366",
            background: "linear-gradient(135deg, rgba(37,211,102,0.15), rgba(37,211,102,0.05))",
            cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(37,211,102,0.25), rgba(37,211,102,0.1))")}
          onMouseLeave={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(37,211,102,0.15), rgba(37,211,102,0.05))")}
        >
          <span style={{ fontSize: 36 }}>📊</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#25D366", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>
              DASHBOARD DE VENDAS
            </p>
            <p style={{ color: MUTED, fontSize: 12 }}>
              Receita hoje · Este mês · Ranking de produtos · Últimas vendas
            </p>
          </div>
          <span style={{ color: "#25D366", fontSize: 20 }}>›</span>
        </button>

        {/* Prestadores — botão destaque */}
        <button
          onClick={() => router.push("/provider/dashboard")}
          style={{
            width: "100%", marginBottom: 16, padding: "20px 24px", borderRadius: 16,
            border: "2px solid #A855F7",
            background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))",
            cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.1))")}
          onMouseLeave={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))")}
        >
          <span style={{ fontSize: 36 }}>🔧</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#A855F7", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>
              PRESTADORES DE SERVIÇO
            </p>
            <p style={{ color: MUTED, fontSize: 12 }}>
              Cadastro · Assinatura R$29,90/mês · Recebe pedidos via WhatsApp
            </p>
          </div>
          <span style={{ color: "#A855F7", fontSize: 20 }}>›</span>
        </button>

        {/* Jennifer Dropship — botão destaque */}
        <button
          onClick={() => router.push("/admin/shop")}
          style={{
            width: "100%", marginBottom: 32, padding: "20px 24px", borderRadius: 16,
            border: "2px solid #3483FA",
            background: "linear-gradient(135deg, rgba(52,131,250,0.15), rgba(52,131,250,0.05))",
            cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 16,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(52,131,250,0.25), rgba(52,131,250,0.1))")}
          onMouseLeave={e => (e.currentTarget.style.background = "linear-gradient(135deg, rgba(52,131,250,0.15), rgba(52,131,250,0.05))")}
        >
          <span style={{ fontSize: 36 }}>🛒</span>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#3483FA", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>
              JENNIFER DROPSHIP
            </p>
            <p style={{ color: MUTED, fontSize: 12 }}>
              Produtos · Revendedoras · Comissões automáticas
            </p>
          </div>
          <span style={{ color: "#3483FA", fontSize: 20 }}>›</span>
        </button>

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
