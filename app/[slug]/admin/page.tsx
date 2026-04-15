"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

type Site = { slug: string; nome: string; nicho: string; whatsapp: string; prompt_voz: string; produto_tipo: string };
type Produto = { id: string; nome: string; preco: string; foto_url: string; descricao: string; categoria: string };
type Artigo = { id: string; titulo: string; conteudo: string; publicado: boolean; criado_em: string };
type Ticket = { id: string; mensagem: string; status: string; criado_em: string };

const TABS = ["Dashboard", "Produtos", "Artigos", "Configurações", "Suporte"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [authed, setAuthed] = useState(false);
  const [senha, setSenha] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [site, setSite] = useState<Site | null>(null);

  // Produtos
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novoProduto, setNovoProduto] = useState({ nome: "", preco: "", foto_url: "", descricao: "", categoria: "" });
  const [savingProd, setSavingProd] = useState(false);

  // Artigos
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [temaArtigo, setTemaArtigo] = useState("");
  const [generatingArt, setGeneratingArt] = useState(false);
  const [viewArtigo, setViewArtigo] = useState<Artigo | null>(null);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketOk, setTicketOk] = useState(false);

  // Config
  const [config, setConfig] = useState({ whatsapp: "", prompt_voz: "", produto_tipo: "basico" });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configOk, setConfigOk] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`vox_admin_${slug}`);
    if (stored === "ok") { setAuthed(true); loadAll(); }
  }, [slug]);

  const loadAll = useCallback(async () => {
    const [s, p, a, t] = await Promise.all([
      fetch(`/api/sites/${slug}`).then((r) => r.json()),
      fetch(`/api/sites/${slug}/produtos`).then((r) => r.json()),
      fetch(`/api/sites/${slug}/artigos`).then((r) => r.json()),
      fetch(`/api/sites/${slug}/tickets`).then((r) => r.json()),
    ]);
    setSite(s);
    setProdutos(p);
    setArtigos(a);
    setTickets(t);
    setConfig({ whatsapp: s.whatsapp ?? "", prompt_voz: s.prompt_voz ?? "", produto_tipo: s.produto_tipo ?? "basico" });
  }, [slug]);

  const login = async () => {
    setLoggingIn(true); setLoginErr("");
    const r = await fetch(`/api/sites/${slug}/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha }) });
    const d = await r.json();
    if (d.ok) { localStorage.setItem(`vox_admin_${slug}`, "ok"); setAuthed(true); loadAll(); }
    else setLoginErr(d.error ?? "Erro ao autenticar");
    setLoggingIn(false);
  };

  const saveProduto = async () => {
    if (!novoProduto.nome || !novoProduto.preco) return;
    setSavingProd(true);
    const r = await fetch(`/api/sites/${slug}/produtos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novoProduto) });
    const p = await r.json();
    setProdutos((prev) => [...prev, p]);
    setNovoProduto({ nome: "", preco: "", foto_url: "", descricao: "", categoria: "" });
    setSavingProd(false);
  };

  const deleteProduto = async (id: string) => {
    await fetch(`/api/sites/${slug}/produtos`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  const generateArtigo = async () => {
    if (!temaArtigo.trim()) return;
    setGeneratingArt(true);
    const r = await fetch("/api/generate-article", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteSlug: slug, tema: temaArtigo }) });
    const d = await r.json();
    const saved = await fetch(`/api/sites/${slug}/artigos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: d.titulo, conteudo: d.conteudo }) });
    const art = await saved.json();
    setArtigos((prev) => [...prev, art]);
    setTemaArtigo("");
    setGeneratingArt(false);
  };

  const deleteArtigo = async (id: string) => {
    await fetch(`/api/sites/${slug}/artigos`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setArtigos((prev) => prev.filter((a) => a.id !== id));
    if (viewArtigo?.id === id) setViewArtigo(null);
  };

  const sendTicket = async () => {
    if (!novaMensagem.trim()) return;
    setSendingTicket(true);
    const r = await fetch(`/api/sites/${slug}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagem: novaMensagem }) });
    const t = await r.json();
    setTickets((prev) => [...prev, t]);
    setNovaMensagem(""); setTicketOk(true); setSendingTicket(false);
    setTimeout(() => setTicketOk(false), 3000);
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    await fetch(`/api/sites/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    setSavingConfig(false); setConfigOk(true);
    setTimeout(() => setConfigOk(false), 3000);
  };

  // ── LOGIN ──
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 360, background: "var(--surface)", borderRadius: 20, padding: "36px 32px", boxShadow: "0 8px 40px rgba(0,0,0,.08)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <div style={{ width: 40, height: 40, background: "var(--accent)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", margin: 0 }}>Painel Admin</p>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>/{slug}</p>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>SENHA DE ACESSO</label>
            <input
              type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Digite a senha do painel"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 14, outline: "none", background: "var(--bg)", color: "var(--text)" }}
            />
            {loginErr && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>{loginErr}</p>}
          </div>
          <button onClick={login} disabled={loggingIn || !senha}
            style={{ width: "100%", padding: "11px 0", background: senha ? "var(--accent)" : "var(--border)", color: "white", border: "none", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: senha ? "pointer" : "default", transition: "background .2s" }}>
            {loggingIn ? "Entrando..." : "Entrar"}
          </button>
          <p style={{ textAlign: "center", fontSize: 12, color: "var(--muted)", marginTop: 20 }}>
            <a href={`/${slug}`} style={{ color: "var(--accent)", textDecoration: "none" }}>← Ver site público</a>
          </p>
        </div>
      </div>
    );
  }

  // ── ADMIN ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Vox Admin</span>
          <span style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", padding: "2px 8px", borderRadius: 6, border: "1px solid var(--border)" }}>{site?.nome ?? slug}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href={`/${slug}`} target="_blank" rel="noopener"
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "var(--accent-light)", color: "var(--accent)", borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>
            Ver site
          </a>
          <button onClick={() => { localStorage.removeItem(`vox_admin_${slug}`); setAuthed(false); }}
            style={{ padding: "6px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
            Sair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 24px", display: "flex", gap: 4 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "12px 16px", background: "none", border: "none", borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent", color: tab === t ? "var(--accent)" : "var(--muted)", fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: "pointer", transition: "all .15s" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "Dashboard" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Visão geral</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Produtos", val: produtos.length, icon: "📦", color: "#7c3aed" },
                { label: "Artigos", val: artigos.length, icon: "📝", color: "#059669" },
                { label: "Tickets abertos", val: tickets.filter((t) => t.status === "aberto").length, icon: "🎫", color: "#dc2626" },
                { label: "Plano", val: site?.produto_tipo === "pro" ? "VOX Pro" : "VOX Básico", icon: "⭐", color: "#d97706" },
              ].map((c) => (
                <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 20px" }}>
                  <p style={{ fontSize: 24, margin: "0 0 8px" }}>{c.icon}</p>
                  <p style={{ fontSize: 26, fontWeight: 700, color: c.color, margin: "0 0 4px" }}>{c.val}</p>
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{c.label}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 12 }}>Links do seu site</p>
              {[
                { label: "Site público", url: `http://localhost:3000/${slug}` },
                { label: "Painel admin", url: `http://localhost:3000/${slug}/admin` },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", width: 90 }}>{l.label}</span>
                  <code style={{ flex: 1, fontSize: 12, background: "var(--bg)", padding: "5px 10px", borderRadius: 6, color: "var(--text)" }}>{l.url}</code>
                  <button onClick={() => navigator.clipboard.writeText(l.url)}
                    style={{ padding: "5px 10px", background: "var(--accent-light)", color: "var(--accent)", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copiar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PRODUTOS ── */}
        {tab === "Produtos" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Produtos</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 14 }}>Adicionar produto</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(["nome", "preco", "categoria", "foto_url"] as const).map((f) => (
                  <div key={f}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>{f === "foto_url" ? "URL DA FOTO" : f === "preco" ? "PREÇO" : f === "nome" ? "NOME" : "CATEGORIA"}</label>
                    <input value={novoProduto[f]} onChange={(e) => setNovoProduto((p) => ({ ...p, [f]: e.target.value }))}
                      placeholder={f === "foto_url" ? "https://..." : f === "preco" ? "R$ 0,00" : ""}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, outline: "none", background: "var(--bg)", color: "var(--text)" }} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 4 }}>DESCRIÇÃO</label>
                <textarea value={novoProduto.descricao} onChange={(e) => setNovoProduto((p) => ({ ...p, descricao: e.target.value }))} rows={2}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, outline: "none", resize: "vertical", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit" }} />
              </div>
              <button onClick={saveProduto} disabled={savingProd || !novoProduto.nome || !novoProduto.preco}
                style={{ marginTop: 12, padding: "9px 20px", background: novoProduto.nome && novoProduto.preco ? "var(--accent)" : "var(--border)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {savingProd ? "Salvando..." : "+ Adicionar produto"}
              </button>
            </div>

            {produtos.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: "40px 0" }}>Nenhum produto cadastrado ainda.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
                {produtos.map((p) => (
                  <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                    {p.foto_url && <img src={p.foto_url} alt={p.nome} style={{ width: "100%", height: 140, objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                    <div style={{ padding: "14px 16px" }}>
                      {p.categoria && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-light)", padding: "2px 7px", borderRadius: 4, textTransform: "uppercase" }}>{p.categoria}</span>}
                      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", margin: "6px 0 2px" }}>{p.nome}</p>
                      <p style={{ fontWeight: 700, fontSize: 16, color: "var(--accent)", margin: "0 0 6px" }}>{p.preco}</p>
                      {p.descricao && <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.5 }}>{p.descricao}</p>}
                      <button onClick={() => deleteProduto(p.id)}
                        style={{ padding: "5px 12px", background: "#fef2f2", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ARTIGOS ── */}
        {tab === "Artigos" && (
          <div>
            {viewArtigo ? (
              <div>
                <button onClick={() => setViewArtigo(null)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--muted)", cursor: "pointer", marginBottom: 20 }}>
                  ← Voltar
                </button>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "28px 32px" }}>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>{viewArtigo.titulo}</h1>
                  <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>{new Date(viewArtigo.criado_em).toLocaleDateString("pt-BR")}</p>
                  <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{viewArtigo.conteudo}</div>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Artigos</h2>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 12 }}>Gerar artigo com IA</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input value={temaArtigo} onChange={(e) => setTemaArtigo(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && generateArtigo()}
                      placeholder={`Ex: Como escolher o melhor ${site?.nicho ?? "produto"} para você`}
                      style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, outline: "none", background: "var(--bg)", color: "var(--text)" }} />
                    <button onClick={generateArtigo} disabled={generatingArt || !temaArtigo.trim()}
                      style={{ padding: "9px 18px", background: temaArtigo.trim() && !generatingArt ? "var(--accent)" : "var(--border)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {generatingArt ? "Gerando..." : "✨ Gerar"}
                    </button>
                  </div>
                </div>
                {artigos.length === 0 ? (
                  <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", padding: "40px 0" }}>Nenhum artigo gerado ainda. Use o campo acima para criar!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {artigos.map((a) => (
                      <div key={a.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.titulo}</p>
                          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>{new Date(a.criado_em).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                          <button onClick={() => setViewArtigo(a)}
                            style={{ padding: "5px 12px", background: "var(--accent-light)", color: "var(--accent)", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Ver</button>
                          <button onClick={() => deleteArtigo(a.id)}
                            style={{ padding: "5px 12px", background: "#fef2f2", color: "var(--danger)", border: "1px solid #fecaca", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CONFIGURAÇÕES ── */}
        {tab === "Configurações" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Configurações</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>NÚMERO DO WHATSAPP</label>
                <input value={config.whatsapp} onChange={(e) => setConfig((c) => ({ ...c, whatsapp: e.target.value }))}
                  placeholder="5511999999999 (com DDI e DDD, sem espaços)"
                  style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, outline: "none", background: "var(--bg)", color: "var(--text)" }} />
                <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Visitantes do site vão clicar nesse número. Inclua DDI (55) + DDD.</p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>PLANO</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["basico", "pro"] as const).map((p) => (
                    <button key={p} onClick={() => setConfig((c) => ({ ...c, produto_tipo: p }))}
                      style={{ flex: 1, padding: "10px 0", border: `2px solid ${config.produto_tipo === p ? "var(--accent)" : "var(--border)"}`, borderRadius: 10, background: config.produto_tipo === p ? "var(--accent-light)" : "var(--bg)", color: config.produto_tipo === p ? "var(--accent)" : "var(--muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      {p === "basico" ? "⭐ VOX Básico" : "🚀 VOX Pro (com voz)"}
                    </button>
                  ))}
                </div>
              </div>

              {config.produto_tipo === "pro" && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>PROMPT DO AGENTE DE VOZ</label>
                  <textarea value={config.prompt_voz} onChange={(e) => setConfig((c) => ({ ...c, prompt_voz: e.target.value }))} rows={5}
                    placeholder={`Ex: Você é um assistente da ${site?.nome ?? "nossa empresa"}. Somos especializados em ${site?.nicho ?? "nosso segmento"}. Seja prestativo e convide o cliente a entrar em contato pelo WhatsApp.`}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, outline: "none", resize: "vertical", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit", lineHeight: 1.6 }} />
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>Este texto define como o assistente de voz vai se comportar no seu site.</p>
                </div>
              )}

              <button onClick={saveConfig} disabled={savingConfig}
                style={{ alignSelf: "flex-start", padding: "10px 24px", background: "var(--accent)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {savingConfig ? "Salvando..." : configOk ? "✓ Salvo!" : "Salvar configurações"}
              </button>
            </div>
          </div>
        )}

        {/* ── SUPORTE ── */}
        {tab === "Suporte" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 20 }}>Suporte</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px", marginBottom: 24 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>Abrir novo ticket</p>
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>Descreva o problema ou melhoria que deseja e nossa equipe irá responder em breve.</p>
              <textarea value={novaMensagem} onChange={(e) => setNovaMensagem(e.target.value)} rows={4}
                placeholder="Descreva o problema com o maior detalhe possível..."
                style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, outline: "none", resize: "vertical", background: "var(--bg)", color: "var(--text)", fontFamily: "inherit" }} />
              <button onClick={sendTicket} disabled={sendingTicket || !novaMensagem.trim()}
                style={{ marginTop: 10, padding: "9px 20px", background: novaMensagem.trim() ? "var(--accent)" : "var(--border)", color: "white", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {sendingTicket ? "Enviando..." : ticketOk ? "✓ Enviado!" : "Enviar ticket"}
              </button>
            </div>

            {tickets.length > 0 && (
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 12 }}>Histórico de tickets</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...tickets].reverse().map((t) => (
                    <div key={t.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: t.status === "aberto" ? "#fef3c7" : t.status === "resolvido" ? "#d1fae5" : "#ede9fe", color: t.status === "aberto" ? "#92400e" : t.status === "resolvido" ? "#065f46" : "var(--accent)" }}>
                          {t.status.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(t.criado_em).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text)", margin: 0, lineHeight: 1.5 }}>{t.mensagem}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
