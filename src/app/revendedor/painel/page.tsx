"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

const AZUL = "#3483FA"; const VERDE = "#00A650"; const BG = "#F5F5F5";
const CINZA = "#666"; const BORDA = "#e5e5e5";

function PainelRevendedorContent() {
  const searchParams = useSearchParams();
  const codigo = searchParams?.get("codigo") || "";
  const [afiliado, setAfiliado] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mostraSaque, setMostraSaque] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [valorSaque, setValorSaque] = useState("");
  const [sacando, setSacando] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://jennifer-ai.vercel.app";

  useEffect(() => {
    if (!codigo) { setLoading(false); return; }
    fetch(`/api/revendedor/painel?codigo=${codigo}`)
      .then(r => r.json())
      .then(d => { if (d.afiliado) setAfiliado(d.afiliado); })
      .finally(() => setLoading(false));
    fetch("/api/shop/produtos")
      .then(r => r.json())
      .then(d => setProdutos(d.produtos || []));
  }, [codigo]);

  function copiar(texto: string, id: string) {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(id);
      setTimeout(() => setCopiado(null), 2000);
    });
  }

  async function solicitarSaque() {
    if (!pixKey || !valorSaque) { alert("Preencha chave PIX e valor."); return; }
    setSacando(true);
    try {
      const res = await fetch("/api/revendedor/saque", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, pixKey, valor: valorSaque }),
      });
      const data = await res.json();
      if (data.erro) { alert(data.erro); return; }
      alert("Saque solicitado! Você receberá em até 24h.");
      setMostraSaque(false);
      setAfiliado((prev: any) => ({ ...prev, saldo: prev.saldo - parseFloat(valorSaque) }));
    } finally { setSacando(false); }
  }

  if (loading) return <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: CINZA }}>Carregando...</p></main>;
  if (!codigo || !afiliado) return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: CINZA, marginBottom: 16 }}>Código de afiliada inválido.</p>
        <a href="/revendedor" style={{ color: AZUL }}>Cadastre-se aqui</a>
      </div>
    </main>
  );

  const linkAfiliada = `${appUrl}/shop?ref=${afiliado.codigo}`;
  const vendasPagas = (afiliado.vendas || []).filter((v: any) => v.status === "pago");
  const totalGanho = vendasPagas.reduce((acc: number, v: any) => acc + v.comissaoValor, 0);

  return (
    <main style={{ minHeight: "100vh", background: BG, fontFamily: "Arial, sans-serif" }}>
      {/* Header */}
      <div style={{ background: AZUL, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color: "#fff", fontWeight: 700 }}>Jennifer Shop</div>
        <div style={{ flex: 1 }} />
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>Olá, {afiliado.nome.split(" ")[0]}!</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Cards de métricas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Cliques no link", valor: afiliado._count?.cliques || 0, icone: "👆" },
            { label: "Vendas realizadas", valor: afiliado._count?.vendas || 0, icone: "🛍️" },
            { label: "Total ganho", valor: `R$ ${totalGanho.toFixed(2).replace(".", ",")}`, icone: "💰" },
          ].map(({ label, valor, icone }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "16px 12px", border: `1px solid ${BORDA}`, textAlign: "center" }}>
              <p style={{ fontSize: 24, marginBottom: 4 }}>{icone}</p>
              <p style={{ color: "#333", fontSize: "1.1rem", fontWeight: 700 }}>{valor}</p>
              <p style={{ color: CINZA, fontSize: 11 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Saldo */}
        <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: `1px solid ${BORDA}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ color: CINZA, fontSize: 12, marginBottom: 4 }}>SALDO DISPONÍVEL</p>
              <p style={{ color: VERDE, fontSize: "1.6rem", fontWeight: 700 }}>R$ {(afiliado.saldo || 0).toFixed(2).replace(".", ",")}</p>
            </div>
            <button onClick={() => setMostraSaque(!mostraSaque)} disabled={(afiliado.saldo || 0) <= 0}
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: (afiliado.saldo || 0) > 0 ? VERDE : "#ccc", color: "#fff", fontWeight: 700, fontSize: 13, cursor: (afiliado.saldo || 0) > 0 ? "pointer" : "default" }}>
              Sacar PIX
            </button>
          </div>

          {mostraSaque && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${BORDA}`, paddingTop: 16 }}>
              <input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Sua chave PIX (CPF, e-mail, telefone ou chave aleatória)"
                style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDA}`, fontSize: 13 }} />
              <input value={valorSaque} onChange={e => setValorSaque(e.target.value)} placeholder={`Valor a sacar (máx R$ ${(afiliado.saldo || 0).toFixed(2).replace(".", ",")})`}
                type="number" style={{ padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDA}`, fontSize: 13 }} />
              <button onClick={solicitarSaque} disabled={sacando}
                style={{ padding: "12px", borderRadius: 8, border: "none", background: sacando ? "#ccc" : VERDE, color: "#fff", fontWeight: 700, cursor: sacando ? "default" : "pointer" }}>
                {sacando ? "Aguarde..." : "Confirmar saque"}
              </button>
            </div>
          )}
        </div>

        {/* Link geral da vitrine */}
        <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: `1px solid ${BORDA}` }}>
          <p style={{ color: "#333", fontWeight: 700, marginBottom: 4 }}>🔗 Link geral da vitrine</p>
          <p style={{ color: CINZA, fontSize: 12, marginBottom: 10 }}>Divulgue todos os produtos de uma vez</p>
          <div style={{ background: "#f0f7ff", borderRadius: 6, padding: "10px 14px", marginBottom: 10 }}>
            <p style={{ color: AZUL, fontSize: 13, wordBreak: "break-all" }}>{linkAfiliada}</p>
          </div>
          <button onClick={() => copiar(linkAfiliada, "geral")}
            style={{ width: "100%", padding: "12px", borderRadius: 8, border: `2px solid ${AZUL}`, background: copiado === "geral" ? AZUL : "transparent", color: copiado === "geral" ? "#fff" : AZUL, fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
            {copiado === "geral" ? "✅ Copiado!" : "📋 Copiar link da vitrine"}
          </button>
        </div>

        {/* Links por produto */}
        {produtos.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: `1px solid ${BORDA}` }}>
            <p style={{ color: "#333", fontWeight: 700, marginBottom: 4 }}>🛍️ Link por produto</p>
            <p style={{ color: CINZA, fontSize: 12, marginBottom: 16 }}>Escolha um produto específico pra divulgar e copie o link</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {produtos.map((p: any) => {
                const link = `${appUrl}/shop/${p.slug}?ref=${afiliado.codigo}`;
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 8, border: `1px solid ${BORDA}`, background: "#fafafa" }}>
                    {p.fotos?.[0] ? (
                      <img src={p.fotos[0]} alt={p.nome} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 6, background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20 }}>🛍️</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#333", fontSize: 13, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nome}</p>
                      <p style={{ color: VERDE, fontSize: 12 }}>{p.comissaoPorc}% de comissão · R$ {p.precoVenda?.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <button onClick={() => copiar(link, p.id)}
                      style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${AZUL}`, background: copiado === p.id ? AZUL : "transparent", color: copiado === p.id ? "#fff" : AZUL, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, transition: "all 0.2s", whiteSpace: "nowrap" }}>
                      {copiado === p.id ? "✅ Copiado!" : "📋 Copiar"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Histórico de vendas */}
        <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: `1px solid ${BORDA}` }}>
          <p style={{ color: "#333", fontWeight: 700, marginBottom: 16 }}>Histórico de comissões</p>
          {(afiliado.vendas || []).length === 0 ? (
            <p style={{ color: CINZA, fontSize: 13, textAlign: "center" }}>Nenhuma venda ainda. Divulgue seu link!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {afiliado.vendas.map((v: any) => (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${BORDA}` }}>
                  <div>
                    <p style={{ color: "#333", fontSize: 13, fontWeight: 600 }}>{v.produto?.nome || "Produto"}</p>
                    <p style={{ color: CINZA, fontSize: 11 }}>{new Date(v.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: v.status === "pago" ? VERDE : CINZA, fontWeight: 700, fontSize: 14 }}>
                      {v.status === "pago" ? `+ R$ ${v.comissaoValor.toFixed(2).replace(".", ",")}` : "pendente"}
                    </p>
                    <p style={{ color: CINZA, fontSize: 11 }}>{v.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Histórico de saques */}
        {(afiliado.saques || []).length > 0 && (
          <div style={{ background: "#fff", borderRadius: 10, padding: 20, border: `1px solid ${BORDA}` }}>
            <p style={{ color: "#333", fontWeight: 700, marginBottom: 16 }}>Histórico de saques</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {afiliado.saques.map((s: any) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 8, background: s.status === "pago" ? "rgba(0,166,80,0.06)" : "rgba(255,193,7,0.06)", border: `1px solid ${s.status === "pago" ? "rgba(0,166,80,0.2)" : "rgba(255,193,7,0.3)"}` }}>
                  <div>
                    <p style={{ color: "#333", fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                      {s.status === "pago" ? "✅ PIX enviado" : "⏳ Aguardando pagamento"}
                    </p>
                    <p style={{ color: CINZA, fontSize: 11 }}>Chave: {s.pixKey}</p>
                    <p style={{ color: CINZA, fontSize: 11 }}>{new Date(s.createdAt).toLocaleDateString("pt-BR")} às {new Date(s.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: s.status === "pago" ? VERDE : "#f39c12", fontWeight: 700, fontSize: 15 }}>
                      R$ {s.valor.toFixed(2).replace(".", ",")}
                    </p>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: s.status === "pago" ? "rgba(0,166,80,0.1)" : "rgba(255,193,7,0.15)", color: s.status === "pago" ? VERDE : "#f39c12", fontWeight: 700 }}>
                      {s.status === "pago" ? "Pago" : "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PainelRevendedorPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ color: "#666" }}>Carregando...</p></main>}>
      <PainelRevendedorContent />
    </Suspense>
  );
}
