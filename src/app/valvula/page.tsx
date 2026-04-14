"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const GREEN = "#1F7A63";
const LIGHT_GREEN = "#e8f5f1";

// ─── tipos ───────────────────────────────────────────────────────────────────
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface FormData {
  nome: string;
  telefone: string;
  endereco: string;
  opcao: "self" | "tecnico";
}

type Step = "sales" | "form" | "pix" | "done";

// ─── helpers ─────────────────────────────────────────────────────────────────
function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return v;
}

// ─── componente principal ─────────────────────────────────────────────────────
export default function ValvulaPage() {
  const [step, setStep] = useState<Step>("sales");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [form, setForm] = useState<FormData>({ nome: "", telefone: "", endereco: "", opcao: "tecnico" });
  const [submitting, setSubmitting] = useState(false);
  const [pixData, setPixData] = useState<{ qr: string; qrBase64: string; orderId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [agentStarted, setAgentStarted] = useState(false);

  // inicia agente após 4s
  useEffect(() => {
    const t = setTimeout(async () => {
      if (agentStarted) return;
      setAgentStarted(true);
      setChatLoading(true);
      try {
        const res = await fetch("/api/valvula/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Olá, quero saber mais sobre a válvula economizadora." }],
          }),
        });
        const data = await res.json();
        setChat([{ role: "assistant", content: data.reply }]);
      } catch {
        setChat([{ role: "assistant", content: "Olá! Sou a Sofia 💧 Posso te ajudar a economizar até 40% na conta de água. Qual o valor da sua conta mensal?" }]);
      } finally {
        setChatLoading(false);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [agentStarted]);

  // scroll automático no chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, chatLoading]);

  // polling de pagamento
  useEffect(() => {
    if (step !== "pix" || !pixData) return;
    const interval = setInterval(async () => {
      setPollCount((c) => c + 1);
      if (pollCount > 60) { clearInterval(interval); return; } // 5 min
      try {
        const res = await fetch(`/api/valvula/orders?key=valvula2024`);
        const orders = await res.json();
        const order = orders.find((o: any) => o.id === pixData.orderId);
        if (order?.status === "pago") {
          clearInterval(interval);
          setStep("done");
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [step, pixData, pollCount]);

  async function sendChat() {
    const text = userInput.trim();
    if (!text || chatLoading) return;
    setUserInput("");
    const newMsgs: ChatMsg[] = [...chat, { role: "user", content: text }];
    setChat(newMsgs);
    setChatLoading(true);
    try {
      const res = await fetch("/api/valvula/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMsgs }),
      });
      const data = await res.json();
      setChat([...newMsgs, { role: "assistant", content: data.reply }]);
    } catch {
      setChat([...newMsgs, { role: "assistant", content: "Desculpe, tente novamente!" }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.telefone || !form.endereco) return;
    setSubmitting(true);
    try {
      const valor = form.opcao === "tecnico" ? 127.50 : 67.90;
      // 1. Cria pedido
      const orderRes = await fetch("/api/valvula/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, valor }),
      });
      const { id: orderId } = await orderRes.json();
      // 2. Gera PIX
      const checkRes = await fetch("/api/valvula/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, nome: form.nome, telefone: form.telefone, opcao: form.opcao, valor }),
      });
      const checkData = await checkRes.json();
      if (checkData.pixQr) {
        setPixData({ qr: checkData.pixQr, qrBase64: checkData.pixQrBase64, orderId });
        setStep("pix");
      }
    } catch (err) {
      alert("Erro ao gerar pagamento. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  function copyPix() {
    if (!pixData?.qr) return;
    navigator.clipboard.writeText(pixData.qr);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  if (step === "done") {
    return (
      <main style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>💧</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: GREEN, marginBottom: 12 }}>Pagamento confirmado!</h1>
          <p style={{ color: "#555", fontSize: 16, lineHeight: 1.6, marginBottom: 24 }}>
            Obrigado pela sua compra! Em breve entraremos em contato pelo WhatsApp para confirmar os detalhes da entrega.
          </p>
          <a
            href={`https://wa.me/5553999516012?text=Olá! Acabei de comprar a HydroBlu. Meu nome é ${encodeURIComponent(form.nome)}.`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: "#25d366", color: "#fff", padding: "14px 32px", borderRadius: 12, fontWeight: 700, textDecoration: "none", display: "inline-block" }}
          >
            💬 Falar no WhatsApp
          </a>
        </div>
      </main>
    );
  }

  if (step === "pix") {
    const valor = form.opcao === "tecnico" ? "R$ 127,50" : "R$ 67,90";
    return (
      <main style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: GREEN, marginBottom: 8 }}>Pague via PIX</h2>
          <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Valor: <strong style={{ color: GREEN }}>{valor}</strong></p>

          {pixData?.qrBase64 && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <img src={`data:image/png;base64,${pixData.qrBase64}`} alt="QR Code PIX" style={{ width: 200, height: 200, borderRadius: 12 }} />
            </div>
          )}

          <div style={{ background: "#f5f5f5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, wordBreak: "break-all", fontSize: 11, color: "#333", textAlign: "left" }}>
            {pixData?.qr}
          </div>

          <button
            onClick={copyPix}
            style={{ background: copied ? "#22c55e" : GREEN, color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%", marginBottom: 12 }}
          >
            {copied ? "✅ Código copiado!" : "📋 Copiar código PIX"}
          </button>

          <p style={{ fontSize: 12, color: "#999" }}>
            Após o pagamento, a confirmação é automática. Aguarde alguns segundos...
          </p>

          <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 8 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, opacity: 0.3 + (pollCount % 3 === i-1 ? 0.7 : 0), transition: "opacity 0.5s" }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (step === "form") {
    const valor = form.opcao === "tecnico" ? "R$ 127,50" : "R$ 67,90";
    return (
      <main style={{ minHeight: "100vh", background: "#fff", padding: "40px 24px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <button onClick={() => setStep("sales")} style={{ background: "none", border: "none", color: GREEN, cursor: "pointer", fontSize: 14, marginBottom: 24, padding: 0 }}>
            ← Voltar
          </button>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>Finalizar compra</h2>
          <p style={{ color: "#666", marginBottom: 28, fontSize: 14 }}>Preencha seus dados para receber a HydroBlu</p>

          {/* seletor de opção */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
            {[
              { key: "self", label: "Instalo eu mesmo", price: "R$ 67,90", sub: "Vem com manual" },
              { key: "tecnico", label: "Com técnico", price: "R$ 127,50", sub: "RECOMENDADO", badge: true },
            ].map((op) => (
              <div
                key={op.key}
                onClick={() => setForm((f) => ({ ...f, opcao: op.key as "self" | "tecnico" }))}
                style={{
                  border: `2px solid ${form.opcao === op.key ? GREEN : "#e5e5e5"}`,
                  borderRadius: 14,
                  padding: "16px 14px",
                  cursor: "pointer",
                  background: form.opcao === op.key ? LIGHT_GREEN : "#fafafa",
                  position: "relative",
                  transition: "all 0.15s",
                }}
              >
                {op.badge && (
                  <div style={{ position: "absolute", top: -10, right: 10, background: GREEN, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.08em" }}>
                    RECOMENDADO
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{op.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: GREEN }}>{op.price}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{op.sub}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <label style={lbl}>Nome completo *</label>
            <input style={inp} value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} placeholder="Seu nome completo" required />

            <label style={lbl}>WhatsApp *</label>
            <input style={inp} value={form.telefone} onChange={e => setForm(f => ({...f, telefone: formatPhone(e.target.value)}))} placeholder="(53) 99999-9999" required />

            <label style={lbl}>Endereço de entrega *</label>
            <input style={inp} value={form.endereco} onChange={e => setForm(f => ({...f, endereco: e.target.value}))} placeholder="Rua, número, bairro, cidade" required />

            <div style={{ background: LIGHT_GREEN, border: `1px solid ${GREEN}30`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: GREEN, fontWeight: 600 }}>
              💰 Total: {valor}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Gerando PIX..." : "Gerar PIX e finalizar compra →"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#999", fontSize: 12 }}>
            <span>🔒</span> Pagamento seguro via Mercado Pago
          </div>
        </div>
      </main>
    );
  }

  // ─── PÁGINA DE VENDAS ────────────────────────────────────────────────────
  return (
    <main style={{ background: "#fff", color: "#1a1a1a", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── HERO ── */}
      <section style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #145948 100%)`, color: "#fff", padding: "60px 24px 50px", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 20, textTransform: "uppercase" }}>
            💧 Tecnologia em economia de água
          </div>
          <h1 style={{ fontSize: "clamp(26px,5vw,46px)", fontWeight: 900, lineHeight: 1.15, marginBottom: 20 }}>
            Você pode estar perdendo até metade do valor da sua conta de água sem perceber
          </h1>
          <p style={{ fontSize: 18, opacity: 0.9, lineHeight: 1.6, marginBottom: 32, maxWidth: 520, margin: "0 auto 32px" }}>
            A <strong>HydroBlu</strong> é a válvula economizadora que reduz até <strong>40% do consumo de água</strong> em qualquer ponto da casa — sem obras, sem complicação.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setStep("form")}
              style={{ background: "#fff", color: GREEN, border: "none", borderRadius: 12, padding: "16px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer" }}
            >
              Quero economizar agora →
            </button>
            <a
              href="https://wa.me/5553999516012"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "2px solid rgba(255,255,255,0.4)", borderRadius: 12, padding: "14px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}
            >
              💬 Falar com especialista
            </a>
          </div>
        </div>
      </section>

      {/* ── PRODUTO IMAGENS ── */}
      <section style={{ padding: "60px 24px", background: "#fafafa" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 800, color: "#1a1a1a" }}>Conheça a HydroBlu</h2>
            <p style={{ color: "#666", marginTop: 8, fontSize: 16 }}>Design compacto, instalação fácil, economia real</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {["/valvula/hydroblu_1.png", "/valvula/hydroblu_2_v2.png", "/valvula/hydroblu_3.png"].map((src, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "#fff", boxShadow: "0 2px 20px rgba(0,0,0,0.08)" }}>
                <img src={src} alt={`HydroBlu ${i+1}`} style={{ width: "100%", height: 220, objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOR / PROBLEMA ── */}
      <section style={{ padding: "60px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, color: "#1a1a1a", marginBottom: 20 }}>
            Por que a conta de água nunca para de subir?
          </h2>
          <p style={{ color: "#555", fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
            A maioria das casas perde até <strong>40% da água</strong> em desperdícios invisíveis — torneiras mal reguladas, chuveiros com fluxo excessivo, pontos de pressão alta. Você paga caro por água que vai direto para o ralo.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { icon: "💸", title: "Água cara demais", desc: "Tarifas sobem todo ano e o desperdício multiplica o custo" },
              { icon: "🚿", title: "Fluxo excessivo", desc: "Chuveiros e torneiras gastam mais do que o necessário" },
              { icon: "🌡️", title: "Pressão descontrolada", desc: "Pressão alta força mais saída de água e desgasta encanamentos" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#fafafa", borderRadius: 14, padding: "24px 16px", border: "1px solid #f0f0f0" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{item.title}</div>
                <div style={{ color: "#777", fontSize: 13, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALCULADORA ── */}
      <section style={{ padding: "60px 24px", background: LIGHT_GREEN }}>
        <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(20px,4vw,32px)", fontWeight: 800, color: GREEN, marginBottom: 8 }}>
            💰 Quanto você vai economizar?
          </h2>
          <p style={{ color: "#555", marginBottom: 32, fontSize: 15 }}>Sua conta hoje → com HydroBlu</p>
          <CalcSection />
        </div>
      </section>

      {/* ── VÍDEOS ── */}
      <section style={{ padding: "60px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 40, color: "#1a1a1a" }}>
            Veja como funciona
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
              <iframe
                width="100%"
                height="260"
                src="https://www.youtube.com/embed/A76CCMtsKGo"
                title="HydroBlu demonstração"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.1)" }}>
              <iframe
                width="100%"
                height="260"
                src="https://www.youtube.com/embed/HtGnKHlcXgU"
                title="HydroBlu instalação"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFÍCIOS ── */}
      <section style={{ padding: "60px 24px", background: "#1a1a1a", color: "#fff" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 40 }}>
            Por que a HydroBlu?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {[
              { icon: "💧", title: "Até 40% de economia", desc: "Na conta de água logo no primeiro mês" },
              { icon: "⚙️", title: "Instalação simples", desc: "Sem obras, encaixa em qualquer torneira" },
              { icon: "💰", title: "ROI em 2 meses", desc: "A válvula se paga rapidamente" },
              { icon: "🌿", title: "Sustentável", desc: "Menos desperdício, mais consciência ambiental" },
              { icon: "🔧", title: "Durável", desc: "Material resistente para anos de uso" },
              { icon: "✅", title: "Garantia", desc: "Satisfação garantida ou devolvemos o valor" },
            ].map((b, i) => (
              <div key={i} style={{ background: "#252525", borderRadius: 14, padding: "20px 16px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>{b.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: "#fff", fontSize: 15 }}>{b.title}</div>
                <div style={{ color: "#999", fontSize: 13, lineHeight: 1.5 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROVA SOCIAL ── */}
      <section style={{ padding: "60px 24px", background: "#fafafa" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 40, color: "#1a1a1a" }}>
            Quem já usa HydroBlu
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 40 }}>
            {[
              { img: "/valvula/prova_social_150_29.png", alt: "Prova social 1" },
              { img: "/valvula/prova_social_230_166_corrigida.png", alt: "Prova social 2" },
              { img: "/valvula/ws1.jpeg", alt: "Resultado cliente" },
              { img: "/valvula/ws3.jpeg", alt: "Resultado cliente 2" },
            ].map((p, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
                <img src={p.img} alt={p.alt} style={{ width: "100%", height: 200, objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREÇOS ── */}
      <section style={{ padding: "60px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(22px,4vw,34px)", fontWeight: 800, textAlign: "center", marginBottom: 8, color: "#1a1a1a" }}>
            Escolha seu plano
          </h2>
          <p style={{ textAlign: "center", color: "#666", marginBottom: 40, fontSize: 15 }}>
            Duas opções, uma missão: economizar água
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>

            {/* Self install */}
            <div style={{ border: "2px solid #e5e5e5", borderRadius: 20, padding: "32px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Instalo eu mesmo</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: "#1a1a1a", lineHeight: 1 }}>R$<span style={{ fontSize: 36 }}>67</span><span style={{ fontSize: 22 }}>,90</span></div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 8, marginBottom: 24 }}>pagamento único</div>
              <ul style={{ textAlign: "left", listStyle: "none", padding: 0, marginBottom: 28 }}>
                {["✅ Válvula HydroBlu", "✅ Manual de instalação", "✅ Suporte por WhatsApp", "✅ Garantia de satisfação"].map(item => (
                  <li key={item} style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>{item}</li>
                ))}
              </ul>
              <button
                onClick={() => { setForm(f => ({...f, opcao: "self"})); setStep("form"); }}
                style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}
              >
                Comprar agora
              </button>
            </div>

            {/* With tech */}
            <div style={{ border: `2px solid ${GREEN}`, borderRadius: 20, padding: "32px 24px", textAlign: "center", position: "relative", background: LIGHT_GREEN }}>
              <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: GREEN, color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 16px", borderRadius: 20, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                MAIS ESCOLHIDO
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Com técnico</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: GREEN, lineHeight: 1 }}>R$<span style={{ fontSize: 36 }}>127</span><span style={{ fontSize: 22 }}>,50</span></div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 8, marginBottom: 24 }}>pagamento único</div>
              <ul style={{ textAlign: "left", listStyle: "none", padding: 0, marginBottom: 28 }}>
                {["✅ Válvula HydroBlu", "✅ Instalação por técnico especializado", "✅ Garantia de funcionamento", "✅ Suporte pós-instalação", "✅ Resultado máximo garantido"].map(item => (
                  <li key={item} style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>{item}</li>
                ))}
              </ul>
              <button
                onClick={() => { setForm(f => ({...f, opcao: "tecnico"})); setStep("form"); }}
                style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", width: "100%" }}
              >
                Quero com instalação →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "60px 24px", background: "#fafafa" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(20px,4vw,30px)", fontWeight: 800, textAlign: "center", marginBottom: 36, color: "#1a1a1a" }}>
            Perguntas frequentes
          </h2>
          {[
            { q: "Funciona em qualquer torneira?", a: "Sim! A HydroBlu é compatível com a maioria das torneiras e pontos de água residenciais." },
            { q: "Precisa chamar encanador?", a: "Não necessariamente. A opção 'instalo eu mesmo' vem com manual completo e é bem simples. Mas se preferir, oferecemos o pacote com técnico." },
            { q: "Em quanto tempo paga o investimento?", a: "Com economia média de 40%, famílias com conta de R$150+ recuperam o investimento em menos de 2 meses." },
            { q: "E se não funcionar na minha casa?", a: "Temos garantia de satisfação. Se não economizar como prometido, devolvemos seu dinheiro." },
          ].map((faq, i) => (
            <details key={i} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, border: "1px solid #ebebeb", padding: "16px 20px" }}>
              <summary style={{ fontWeight: 700, cursor: "pointer", fontSize: 15, color: "#1a1a1a" }}>{faq.q}</summary>
              <p style={{ color: "#666", marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: "70px 24px", background: `linear-gradient(135deg, ${GREEN} 0%, #145948 100%)`, color: "#fff", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(24px,5vw,42px)", fontWeight: 900, marginBottom: 16 }}>
            Comece a economizar hoje
          </h2>
          <p style={{ fontSize: 17, opacity: 0.9, marginBottom: 36, lineHeight: 1.6 }}>
            Cada dia sem a HydroBlu é dinheiro indo pelo ralo. Instale agora e veja a diferença na próxima conta.
          </p>
          <button
            onClick={() => setStep("form")}
            style={{ background: "#fff", color: GREEN, border: "none", borderRadius: 12, padding: "18px 48px", fontSize: 18, fontWeight: 800, cursor: "pointer", marginBottom: 16 }}
          >
            Garantir minha HydroBlu →
          </button>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Pagamento seguro via PIX • Envio imediato</div>
        </div>
      </section>

      {/* ── AGENTE CHAT ── */}
      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        width: chat.length > 0 ? 340 : "auto",
      }}>
        {chat.length > 0 && (
          <div style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            border: `1px solid ${GREEN}30`,
            marginBottom: 8,
            overflow: "hidden",
          }}>
            {/* cabeçalho */}
            <div style={{ background: GREEN, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💧</div>
              <div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>Sofia</div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11 }}>Consultora HydroBlu</div>
              </div>
            </div>
            {/* mensagens */}
            <div style={{ height: 240, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {chat.map((m, i) => (
                <div key={i} style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? GREEN : "#f5f5f5",
                  color: m.role === "user" ? "#fff" : "#1a1a1a",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 14px",
                  maxWidth: "85%",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <div style={{ alignSelf: "flex-start", background: "#f5f5f5", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 13, color: "#999" }}>
                  digitando...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* input */}
            <div style={{ padding: "10px 12px", borderTop: "1px solid #f0f0f0", display: "flex", gap: 8 }}>
              <input
                ref={chatInputRef}
                style={{ flex: 1, border: "1px solid #e5e5e5", borderRadius: 10, padding: "8px 12px", fontSize: 13, outline: "none" }}
                placeholder="Sua mensagem..."
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendChat(); }}
              />
              <button
                onClick={sendChat}
                style={{ background: GREEN, color: "#fff", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16, flexShrink: 0 }}
              >
                ↑
              </button>
            </div>
          </div>
        )}

        {/* botão flutuante WhatsApp */}
        <a
          href="https://wa.me/5553999516012"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#25d366",
            color: "#fff",
            borderRadius: 50,
            padding: chat.length > 0 ? "10px 16px" : "14px 20px",
            fontWeight: 700,
            fontSize: 14,
            textDecoration: "none",
            boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
          }}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          {chat.length === 0 && "Falar com especialista"}
        </a>
      </div>
    </main>
  );
}

// ─── calculadora ─────────────────────────────────────────────────────────────
function CalcSection() {
  const [conta, setConta] = useState(150);
  const economia = Math.round(conta * 0.40);
  const novaFatura = conta - economia;
  const payback = (67.90 / economia).toFixed(1);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 14, color: "#555", display: "block", marginBottom: 8 }}>Minha conta de água: <strong style={{ color: GREEN }}>R$ {conta}</strong>/mês</label>
        <input
          type="range"
          min={50}
          max={800}
          step={10}
          value={conta}
          onChange={e => setConta(Number(e.target.value))}
          style={{ width: "100%", accentColor: GREEN }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa", marginTop: 4 }}>
          <span>R$ 50</span><span>R$ 800</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 12px", border: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#e53e3e" }}>R$ {conta}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Conta atual</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 12px", border: `1px solid ${GREEN}` }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>R$ {novaFatura}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Com HydroBlu</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 14, padding: "16px 12px", border: "1px solid #e5e5e5" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a" }}>R$ {economia}</div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>Economia/mês</div>
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 14, color: "#666" }}>
        💡 A válvula se paga em apenas <strong style={{ color: GREEN }}>{payback} meses</strong>
      </p>
    </div>
  );
}

// ─── estilos de formulário ────────────────────────────────────────────────────
const lbl: React.CSSProperties = {
  fontSize: 11,
  color: "#888",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

const inp: React.CSSProperties = {
  width: "100%",
  border: "1.5px solid #e5e5e5",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 15,
  color: "#1a1a1a",
  outline: "none",
  marginBottom: 16,
  boxSizing: "border-box",
  fontFamily: "inherit",
};
