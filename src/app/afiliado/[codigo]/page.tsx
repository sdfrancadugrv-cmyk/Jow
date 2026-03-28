"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

interface Venda {
  id: string;
  clientePhone: string;
  valorPago: number;
  comissao: number;
  status: string;
  createdAt: string;
}

interface Saque {
  id: string;
  valor: number;
  pixKey: string;
  status: string;
  createdAt: string;
}

interface DashboardData {
  afiliado: { nome: string; whatsapp: string; codigo: string; saldo: number; createdAt: string };
  produto: { nome: string; preco: string };
  stats: { totalVendas: number; totalGanho: number; sacado: number };
  vendas: Venda[];
  saques: Saque[];
  linkAfiliado: string;
}

export default function AffiliateDashboard() {
  const params = useParams<{ codigo: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  // Modal: gerar cobrança
  const [modalCobranca, setModalCobranca] = useState(false);
  const [clientePhone, setClientePhone] = useState("");
  const [gerandoPix, setGerandoPix] = useState(false);
  const [pixGerado, setPixGerado] = useState<{ pixCode: string; pixQrBase64: string | null; valor: number } | null>(null);

  // Modal: saque
  const [modalSaque, setModalSaque] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [sacando, setSacando] = useState(false);
  const [saqueSucesso, setSaqueSucesso] = useState(false);

  const [copiado, setCopiado] = useState(false);
  const [copiadoPix, setCopiadoPix] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/afiliado/${params.codigo}/dashboard`);
      if (!res.ok) { setErro("Dashboard não encontrado."); setLoading(false); return; }
      const d = await res.json();
      setData(d);
    } catch {
      setErro("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [params.codigo]);

  useEffect(() => { loadData(); }, [loadData]);

  async function gerarCobranca() {
    if (!clientePhone.trim()) return;
    setGerandoPix(true);
    try {
      const res = await fetch("/api/afiliado/gerar-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: params.codigo, clientePhone }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "Erro ao gerar pagamento"); return; }
      setPixGerado({ pixCode: d.pixCode, pixQrBase64: d.pixQrBase64, valor: d.valor });
    } catch {
      alert("Erro ao gerar pagamento. Tente novamente.");
    } finally {
      setGerandoPix(false);
    }
  }

  async function solicitarSaque() {
    if (!pixKey.trim()) return;
    setSacando(true);
    try {
      const res = await fetch(`/api/afiliado/${params.codigo}/saque`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixKey }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || "Erro ao solicitar saque"); setSacando(false); return; }
      setSaqueSucesso(true);
      await loadData();
    } catch {
      alert("Erro ao solicitar saque. Tente novamente.");
    } finally {
      setSacando(false);
    }
  }

  function copiarLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.linkAfiliado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  function copiarPix() {
    if (!pixGerado?.pixCode) return;
    navigator.clipboard.writeText(pixGerado.pixCode);
    setCopiadoPix(true);
    setTimeout(() => setCopiadoPix(false), 2500);
  }

  function fecharCobranca() {
    setModalCobranca(false);
    setClientePhone("");
    setPixGerado(null);
  }

  function fecharSaque() {
    setModalSaque(false);
    setPixKey("");
    setSaqueSucesso(false);
  }

  const bg = "#070B18";
  const cor1 = "#D4A017";
  const cor2 = "#E8C040";
  const surface = "rgba(212,160,23,0.05)";
  const border = "rgba(212,160,23,0.18)";
  const muted = "#7A6018";
  const text = "#C8B070";

  if (loading) return (
    <main style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", border: `3px solid ${border}`, borderTopColor: cor1, animation: "spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  if (erro || !data) return (
    <main style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: muted }}>{erro || "Erro desconhecido."}</p>
    </main>
  );

  const { afiliado, produto, stats, vendas, saques, linkAfiliado } = data;

  return (
    <main style={{ minHeight: "100vh", background: bg, fontFamily: "'Inter', system-ui, sans-serif", color: text, padding: "0 0 80px" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: ${cor1}40; border-radius: 4px; }
        .btn-primary { padding: 14px 28px; border-radius: 12px; background: linear-gradient(135deg, ${cor1}, ${cor2}); color: #060606; font-weight: 800; font-size: 14px; border: none; cursor: pointer; transition: transform 0.15s; }
        .btn-primary:hover { transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .card { background: ${surface}; border: 1px solid ${border}; border-radius: 16px; padding: 20px; }
        input { width: 100%; padding: 13px 16px; border-radius: 12px; border: 1px solid ${border}; background: rgba(255,255,255,0.04); color: #fff; font-size: 15px; outline: none; }
        input::placeholder { color: ${muted}; }
        input:focus { border-color: ${cor1}88; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background: `${bg}F2`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${border}`, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${cor2}, ${cor1} 60%, #1a0e00)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          💼
        </div>
        <div>
          <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 15 }}>Olá, {afiliado.nome}</p>
          <p style={{ margin: 0, color: muted, fontSize: 12 }}>Dashboard do Revendedor · {produto.nome}</p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px" }}>

        {/* ── STATS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Vendas", value: stats.totalVendas.toString(), icon: "🛒" },
            { label: "Total ganho", value: `R$ ${stats.totalGanho.toFixed(2).replace(".", ",")}`, icon: "💰" },
            { label: "Saldo disponível", value: `R$ ${afiliado.saldo.toFixed(2).replace(".", ",")}`, icon: "💳", destaque: afiliado.saldo > 0 },
          ].map((s, i) => (
            <div key={i} className="card" style={{ textAlign: "center", borderColor: s.destaque ? `${cor1}66` : border }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: "clamp(1rem, 3vw, 1.35rem)", fontWeight: 800, color: s.destaque ? cor1 : "#fff", marginBottom: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: muted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── AÇÕES PRINCIPAIS ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <button className="btn-primary" onClick={() => setModalCobranca(true)} style={{ flex: 1, minWidth: 160 }}>
            📲 Gerar Cobrança
          </button>
          <button
            onClick={() => setModalSaque(true)}
            disabled={afiliado.saldo < 1}
            style={{
              flex: 1, minWidth: 160, padding: "14px 28px", borderRadius: 12,
              border: `1px solid ${afiliado.saldo > 0 ? cor1 + "66" : border}`,
              background: afiliado.saldo > 0 ? `${cor1}18` : "none",
              color: afiliado.saldo > 0 ? cor1 : muted,
              fontWeight: 800, fontSize: 14, cursor: afiliado.saldo > 0 ? "pointer" : "not-allowed",
            }}
          >
            💸 Sacar R$ {afiliado.saldo.toFixed(2).replace(".", ",")}
          </button>
        </div>

        {/* ── LINK DE AFILIADO ── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: cor2, fontWeight: 700, fontSize: 13, marginBottom: 8, margin: "0 0 10px" }}>🔗 Seu link de divulgação</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${border}`, fontSize: 12, color: text, wordBreak: "break-all" }}>
              {linkAfiliado}
            </div>
            <button onClick={copiarLink} style={{ flexShrink: 0, padding: "10px 16px", borderRadius: 10, border: `1px solid ${border}`, background: copiado ? `${cor1}22` : "none", color: copiado ? cor1 : muted, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
          </div>
          <p style={{ color: muted, fontSize: 11, marginTop: 8, margin: "8px 0 0" }}>Compartilhe esse link. Cada venda feita por ele dá R$ 30,00 de comissão para você.</p>
        </div>

        {/* ── HISTÓRICO DE VENDAS ── */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14, margin: "0 0 14px" }}>Histórico de Vendas</p>
          {vendas.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: 32 }}>
              <p style={{ color: muted, fontSize: 13, margin: 0 }}>Nenhuma venda ainda. Compartilhe seu link e comece a ganhar!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vendas.map((v) => (
                <div key={v.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${cor1}22`, border: `1px solid ${cor1}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    ✅
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: "#fff", fontSize: 13, fontWeight: 600 }}>
                      Cliente: {v.clientePhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                    </p>
                    <p style={{ margin: 0, color: muted, fontSize: 11 }}>
                      {new Date(v.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: 0, color: "#fff", fontSize: 13 }}>R$ {v.valorPago.toFixed(2).replace(".", ",")}</p>
                    <p style={{ margin: 0, color: cor1, fontSize: 11, fontWeight: 700 }}>+R$ {v.comissao.toFixed(2).replace(".", ",")} comissão</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── HISTÓRICO DE SAQUES ── */}
        {saques.length > 0 && (
          <div>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 14, margin: "0 0 14px" }}>Saques Solicitados</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {saques.map((s) => (
                <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: s.status === "pago" ? "rgba(76,175,80,0.15)" : `${cor1}15`, border: `1px solid ${s.status === "pago" ? "rgba(76,175,80,0.4)" : cor1 + "44"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {s.status === "pago" ? "✅" : "⏳"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: "#fff", fontSize: 13, fontWeight: 600 }}>
                      R$ {s.valor.toFixed(2).replace(".", ",")}
                    </p>
                    <p style={{ margin: 0, color: muted, fontSize: 11 }}>PIX: {s.pixKey} · {new Date(s.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.status === "pago" ? "#4CAF50" : cor2, padding: "4px 10px", borderRadius: 20, background: s.status === "pago" ? "rgba(76,175,80,0.12)" : `${cor2}18`, border: `1px solid ${s.status === "pago" ? "rgba(76,175,80,0.3)" : cor2 + "44"}` }}>
                    {s.status === "pago" ? "Pago" : "Pendente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: GERAR COBRANÇA ── */}
      {modalCobranca && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#0C1020", border: `1px solid ${border}`, borderRadius: 22, padding: 32, maxWidth: 420, width: "100%" }}>
            {!pixGerado ? (
              <>
                <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.2rem", marginBottom: 8, margin: "0 0 8px" }}>📲 Gerar Cobrança PIX</h3>
                <p style={{ color: muted, fontSize: 13, marginBottom: 24, margin: "0 0 24px", lineHeight: 1.6 }}>
                  Digite o WhatsApp do cliente. O código PIX será enviado automaticamente para ele.
                </p>
                <input
                  value={clientePhone}
                  onChange={e => setClientePhone(e.target.value)}
                  placeholder="(00) 90000-0000"
                  style={{ marginBottom: 16 }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={fecharCobranca} style={{ flex: 1, padding: 13, borderRadius: 12, border: `1px solid ${border}`, background: "none", color: muted, cursor: "pointer", fontSize: 13 }}>
                    Cancelar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={gerarCobranca}
                    disabled={gerandoPix || !clientePhone.trim()}
                    style={{ flex: 2 }}
                  >
                    {gerandoPix ? "Gerando…" : "Enviar PIX"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
                  <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.2rem", margin: "0 0 6px" }}>PIX enviado!</h3>
                  <p style={{ color: muted, fontSize: 13, margin: 0 }}>O código PIX foi enviado automaticamente para o WhatsApp do cliente.</p>
                </div>

                {pixGerado.pixQrBase64 && (
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <img src={`data:image/png;base64,${pixGerado.pixQrBase64}`} alt="QR PIX" style={{ width: 180, height: 180, borderRadius: 12, border: `1px solid ${border}` }} />
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <p style={{ color: muted, fontSize: 11, marginBottom: 6, margin: "0 0 6px" }}>Código PIX (copia e cola):</p>
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${border}`, fontSize: 11, color: text, wordBreak: "break-all", maxHeight: 80, overflow: "auto" }}>
                    {pixGerado.pixCode}
                  </div>
                  <button onClick={copiarPix} style={{ marginTop: 8, width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${border}`, background: copiadoPix ? `${cor1}22` : "none", color: copiadoPix ? cor1 : muted, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                    {copiadoPix ? "✓ Copiado!" : "Copiar código PIX"}
                  </button>
                </div>

                <button className="btn-primary" onClick={fecharCobranca} style={{ width: "100%" }}>
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: SAQUE ── */}
      {modalSaque && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
          <div style={{ background: "#0C1020", border: `1px solid ${border}`, borderRadius: 22, padding: 32, maxWidth: 420, width: "100%", textAlign: "center" }}>
            {!saqueSucesso ? (
              <>
                <div style={{ fontSize: 44, marginBottom: 12 }}>💸</div>
                <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.2rem", marginBottom: 8, margin: "0 0 8px" }}>
                  Sacar R$ {afiliado.saldo.toFixed(2).replace(".", ",")}
                </h3>
                <p style={{ color: muted, fontSize: 13, marginBottom: 24, margin: "0 0 24px", lineHeight: 1.6 }}>
                  Informe sua chave PIX para receber a transferência em até 24 horas.
                </p>
                <input
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  placeholder="CPF, email, telefone ou chave aleatória"
                  style={{ marginBottom: 16, textAlign: "center" }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={fecharSaque} style={{ flex: 1, padding: 13, borderRadius: 12, border: `1px solid ${border}`, background: "none", color: muted, cursor: "pointer", fontSize: 13 }}>
                    Cancelar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={solicitarSaque}
                    disabled={sacando || !pixKey.trim()}
                    style={{ flex: 2 }}
                  >
                    {sacando ? "Solicitando…" : "Confirmar Saque"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <h3 style={{ color: "#fff", fontFamily: "Georgia, serif", fontSize: "1.2rem", marginBottom: 8, margin: "0 0 8px" }}>Saque solicitado!</h3>
                <p style={{ color: muted, fontSize: 13, marginBottom: 24, margin: "0 0 24px", lineHeight: 1.6 }}>
                  Você receberá o PIX em até <strong style={{ color: cor2 }}>24 horas</strong>. Você também receberá uma confirmação no seu WhatsApp.
                </p>
                <button className="btn-primary" onClick={fecharSaque} style={{ width: "100%" }}>
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
