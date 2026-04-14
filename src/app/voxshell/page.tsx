"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type AppState = "idle" | "listening" | "processing" | "speaking";
type Msg = { role: "user" | "assistant"; content: string };
type VoxResp = {
  type: "message" | "site" | "agent_setup" | "dashboard";
  message?: string;
  html?: string;
  slug?: string;
  nome?: string;
  personalidade?: string;
};
type RightTab = "website" | "admin";
type AdminSection = "agente" | "artigos" | "fotos" | "videos" | "publicar";

const A = "#7c3aed", BG = "#0a0a0a", SUR = "#111", BOR = "#1e1e1e",
  TX = "#e8e8e8", MU = "#555", OK = "#22c55e", ER = "#ef4444";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{background:${BG};font-family:'Inter',system-ui,sans-serif}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes wv{0%,100%{height:5px}50%{height:18px}}
@keyframes rng{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.6);opacity:0}}
@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.spin{animation:spin .8s linear infinite}
.wv{animation:wv .75s ease-in-out infinite}
.rng{animation:rng 1.4s ease-out infinite}
.rng2{animation:rng 1.4s .4s ease-out infinite}
.fi{animation:fi .2s ease}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#222;border-radius:4px}
input,textarea{font-family:inherit;outline:none}
`;

export default function VoxShellPage() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>("idle");
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [resp, setResp]         = useState<VoxResp | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [status, setStatus]     = useState("Segure para falar");
  const [input, setInput]       = useState("");

  // Abas do lado direito
  const [rightTab, setRightTab]       = useState<RightTab>("website");
  const [adminSection, setAdminSection] = useState<AdminSection>("agente");

  // Agente de IA
  const [agName, setAgName]   = useState("");
  const [agPers, setAgPers]   = useState("");
  const [agSaving, setAgSaving] = useState(false);
  const [agSaved, setAgSaved]   = useState(false);

  // Conteúdo do site
  const [artigos, setArtigos] = useState<{ titulo: string; texto: string }[]>([]);
  const [fotos,   setFotos]   = useState<{ url: string; legenda: string }[]>([]);
  const [videos,  setVideos]  = useState<{ url: string; legenda: string }[]>([]);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stmRef = useRef<MediaStream | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scroll = useCallback(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), []);

  // TTS
  const speak = useCallback(async (text: string) => {
    setAppState("speaking"); setStatus("VoxShell falando...");
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 280) }),
      });
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const aud  = new Audio(url);
      await new Promise<void>(r => { aud.onended = aud.onerror = () => r(); aud.play().catch(() => r()); });
      URL.revokeObjectURL(url);
    } catch {}
    finally { setAppState("idle"); setStatus("Segure para falar"); }
  }, []);

  // Envia mensagem
  const send = useCallback(async (text: string) => {
    setAppState("processing"); setStatus("Pensando...");
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next); setTimeout(scroll, 80);
    try {
      const res = await fetch("/api/voxshell/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data: VoxResp = await res.json();
      setResp(data); setDeployUrl(null);
      const reply = data.message || "Pronto!";
      setMsgs([...next, { role: "assistant", content: reply }]);
      setTimeout(scroll, 80);
      if (data.personalidade && !agPers) setAgPers(data.personalidade);
      if (data.nome && !agName) setAgName(`Atendente ${data.nome}`);
      // Quando gera site, muda para a aba Website automaticamente
      if (data.type === "site") setRightTab("website");
      await speak(reply);
    } catch { await speak("Erro. Tente novamente."); }
  }, [msgs, agPers, agName, speak, scroll]);

  // Gravação
  const startRec = useCallback(async () => {
    if (appState !== "idle") return;
    chunks.current = [];
    try {
      const stm = await navigator.mediaDevices.getUserMedia({ audio: true });
      stmRef.current = stm;
      const rec = new MediaRecorder(stm, { mimeType: "audio/webm" });
      recRef.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.onstop = async () => {
        stmRef.current?.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (blob.size < 2000) { setAppState("idle"); setStatus("Segure para falar"); return; }
        setAppState("processing"); setStatus("Processando...");
        try {
          const form = new FormData();
          form.append("audio", blob, "audio.webm");
          const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
          const { text } = await res.json();
          if (text?.trim()) await send(text.trim());
          else { setAppState("idle"); setStatus("Não ouvi. Tente de novo."); }
        } catch { setAppState("idle"); setStatus("Erro."); }
      };
      rec.start(100);
      setAppState("listening"); setStatus("Gravando... solte para enviar");
    } catch { setAppState("idle"); setStatus("Microfone bloqueado."); }
  }, [appState, send]);

  const stopRec = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  // Salva agente
  const saveAgent = async () => {
    if (!agName.trim() || !agPers.trim()) return;
    setAgSaving(true);
    try {
      const res = await fetch("/api/whatsapp/agents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agName, personality: agPers,
          instanceId: "pending", token: "pending", phone: "pending",
          followupRules: [], mediaLibrary: [],
        }),
      });
      if (res.ok) setAgSaved(true);
    } catch {}
    finally { setAgSaving(false); }
  };

  // Deploy
  const deploy = async () => {
    if (!resp?.html) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/voxshell/deploy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: resp.html, projectName: resp.slug }),
      });
      const data = await res.json();
      if (data.url) { setDeployUrl(data.url); await speak("Site publicado!"); }
    } catch {}
    finally { setDeploying(false); }
  };

  const busy        = appState !== "idle";
  const isListening  = appState === "listening";
  const isProcessing = appState === "processing";
  const isSpeaking   = appState === "speaking";
  const hasSite      = !!resp?.html;

  const SUGS = [
    "Crie um site para minha clínica",
    "Quero um site de restaurante",
    "Site para barbearia moderna",
    "Site para academia de ginástica",
  ];

  // Estilo compartilhado de input do admin
  const adminInput: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9, fontSize: 13,
    background: BG, border: `1px solid ${BOR}`, color: TX, marginBottom: 12,
  };
  const adminLabel: React.CSSProperties = {
    display: "block", fontSize: 10, color: MU, letterSpacing: "0.1em",
    textTransform: "uppercase", marginBottom: 6, fontWeight: 700,
  };
  const adminAddBtn: React.CSSProperties = {
    fontSize: 11, color: A, background: "rgba(124,58,237,.08)",
    border: `1px solid rgba(124,58,237,.2)`, borderRadius: 7,
    padding: "3px 10px", cursor: "pointer",
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display:"flex", height:"100dvh", overflow:"hidden", background:BG }}>

        {/* ══ ESQUERDO: CHAT + VOZ ══ */}
        <div style={{ width:360, minWidth:360, display:"flex", flexDirection:"column", background:SUR, borderRight:`1px solid ${BOR}` }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${BOR}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:A, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize:15, fontWeight:800, color:TX, letterSpacing:"-0.03em" }}>
                  Vox<span style={{ color:A }}>Shell</span>
                </p>
                <p style={{ fontSize:11, color:MU, marginTop:1 }}>Criador de sites por voz</p>
              </div>
            </div>
            <button onClick={() => router.push("/voxshell/painel")}
              style={{ fontSize:11, color:MU, background:"none", border:`1px solid ${BOR}`, borderRadius:8, padding:"6px 10px", cursor:"pointer" }}>
              Painel →
            </button>
          </div>

          {/* Mensagens */}
          <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:10 }}>
            {msgs.length === 0 ? (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:"32px 0" }}>
                <div style={{ width:52, height:52, borderRadius:18, background:"rgba(124,58,237,.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={A} strokeWidth="2" strokeLinecap="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </div>
                <div style={{ textAlign:"center" }}>
                  <p style={{ fontSize:14, fontWeight:700, color:TX }}>Olá! Sou o VoxShell.</p>
                  <p style={{ fontSize:12, color:MU, marginTop:5, lineHeight:1.6 }}>
                    Me diga qual site você quer criar<br/>e eu gero na hora.
                  </p>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:7, width:"100%" }}>
                  {SUGS.map(s => (
                    <button key={s} onClick={() => setInput(s)}
                      style={{ textAlign:"left", padding:"10px 14px", borderRadius:12, fontSize:12, color:MU, background:BG, border:`1px solid ${BOR}`, cursor:"pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : msgs.map((m, i) => (
              <div key={i} className="fi" style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && (
                  <div style={{ width:24, height:24, borderRadius:8, background:A, display:"flex", alignItems:"center", justifyContent:"center", marginRight:8, flexShrink:0, marginTop:2 }}>
                    <span style={{ color:"white", fontSize:10, fontWeight:800 }}>V</span>
                  </div>
                )}
                <div style={{
                  maxWidth:230, padding:"10px 14px", borderRadius:16, fontSize:13, lineHeight:1.5,
                  ...(m.role==="user"
                    ? { background:A, color:"#fff", borderBottomRightRadius:4 }
                    : { background:BG, color:TX, border:`1px solid ${BOR}`, borderBottomLeftRadius:4 }),
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={endRef}/>
          </div>

          {/* Controles de voz */}
          <div style={{ padding:"18px 20px", borderTop:`1px solid ${BOR}`, display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, height:14 }}>
              {busy && <div style={{ width:5, height:5, borderRadius:"50%", background: isListening ? ER : A, animation:"wv .9s infinite" }}/>}
              <p style={{ fontSize:11, color: isListening ? ER : MU }}>{status}</p>
            </div>

            <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {isListening && (
                <>
                  <div className="rng" style={{ position:"absolute", width:88, height:88, borderRadius:"50%", border:`1px solid rgba(239,68,68,.3)`, background:"rgba(239,68,68,.05)" }}/>
                  <div className="rng2" style={{ position:"absolute", width:114, height:114, borderRadius:"50%", background:"rgba(239,68,68,.02)" }}/>
                </>
              )}
              <button
                onPointerDown={startRec} onPointerUp={stopRec} onPointerLeave={stopRec} onPointerCancel={stopRec}
                disabled={isProcessing || isSpeaking}
                style={{
                  width:64, height:64, borderRadius:"50%", border:"none",
                  cursor: (isProcessing||isSpeaking) ? "default" : "pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  position:"relative", zIndex:1, userSelect:"none",
                  background: isListening ? ER : isSpeaking ? OK : A,
                  boxShadow: isListening ? `0 0 0 6px rgba(239,68,68,.15)` : `0 4px 24px rgba(124,58,237,.35)`,
                  opacity: isProcessing ? .55 : 1,
                  transform: isListening ? "scale(1.07)" : "scale(1)",
                  transition:"all .15s",
                }}
              >
                {isProcessing
                  ? <div className="spin" style={{ width:20, height:20, border:"2.5px solid white", borderTopColor:"transparent", borderRadius:"50%" }}/>
                  : (isListening||isSpeaking)
                  ? <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:20 }}>
                      {[0,1,2,3].map(j => <div key={j} className="wv" style={{ width:3, borderRadius:2, background:"white", animationDelay:`${j*.1}s` }}/>)}
                    </div>
                  : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    </svg>
                }
              </button>
            </div>

            <div style={{ display:"flex", width:"100%", gap:8 }}>
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && !busy && input.trim()) { send(input.trim()); setInput(""); } }}
                disabled={busy} placeholder="Ou digite aqui..."
                style={{ flex:1, padding:"10px 14px", borderRadius:12, fontSize:13, background:BG, border:`1px solid ${BOR}`, color:TX }}
              />
              <button
                onClick={() => { if (!busy && input.trim()) { send(input.trim()); setInput(""); } }}
                disabled={busy || !input.trim()}
                style={{ width:40, height:40, borderRadius:12, border:`1px solid ${BOR}`, cursor:"pointer", flexShrink:0,
                  background: input.trim()&&!busy ? A : BG, color: input.trim()&&!busy ? "white" : MU,
                  display:"flex", alignItems:"center", justifyContent:"center" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ══ DIREITO: PREVIEW + PAINEL ADMIN ══ */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:BG }}>

          {/* Toolbar com os dois botões */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:SUR, borderBottom:`1px solid ${BOR}`, gap:10 }}>

            {/* Botões Website / Painel Admin */}
            <div style={{ display:"flex", gap:4, background:BG, border:`1px solid ${BOR}`, borderRadius:10, padding:3 }}>
              <button
                onClick={() => setRightTab("website")}
                style={{
                  padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, border:"none", cursor:"pointer",
                  background: rightTab==="website" ? SUR : "transparent",
                  color: rightTab==="website" ? TX : MU,
                  boxShadow: rightTab==="website" ? `0 1px 4px rgba(0,0,0,.4)` : "none",
                  transition:"all .15s",
                }}
              >
                🌐 Website
              </button>
              <button
                onClick={() => setRightTab("admin")}
                style={{
                  padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, border:"none", cursor:"pointer",
                  background: rightTab==="admin" ? A : "transparent",
                  color: rightTab==="admin" ? "white" : MU,
                  boxShadow: rightTab==="admin" ? `0 2px 8px rgba(124,58,237,.4)` : "none",
                  transition:"all .15s",
                }}
              >
                ⚙️ Painel Admin
              </button>
            </div>

            {/* URL bar e botão abrir (só quando tem site e está na aba website) */}
            {hasSite && rightTab === "website" && (
              <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                <div style={{ display:"flex", gap:5 }}>
                  <div style={{ width:11, height:11, borderRadius:"50%", background:"#ff5f57" }}/>
                  <div style={{ width:11, height:11, borderRadius:"50%", background:"#febc2e" }}/>
                  <div style={{ width:11, height:11, borderRadius:"50%", background:"#28c840" }}/>
                </div>
                <div style={{ flex:1, padding:"4px 12px", borderRadius:8, background:BG, border:`1px solid ${BOR}`, fontSize:11, color:MU, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {deployUrl || "preview local"}
                </div>
                {deployUrl && (
                  <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                    style={{ padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700, background:OK, color:"white", textDecoration:"none", flexShrink:0 }}>
                    ↗ Abrir
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ── CONTEÚDO: WEBSITE ── */}
          {rightTab === "website" && (
            <div style={{ flex:1, overflow:"hidden" }}>
              {hasSite
                ? <iframe srcDoc={resp!.html!} style={{ width:"100%", height:"100%", border:"none" }} sandbox="allow-scripts" title="Preview"/>
                : <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:14 }}>
                    <div style={{ width:72, height:72, borderRadius:20, background:SUR, border:`1px solid ${BOR}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BOR} strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18"/><path d="M9 21V9"/>
                      </svg>
                    </div>
                    <div style={{ textAlign:"center" }}>
                      <p style={{ fontSize:14, fontWeight:600, color:TX }}>Nenhum site ainda</p>
                      <p style={{ fontSize:12, color:MU, marginTop:6, lineHeight:1.6 }}>
                        Fale ou escreva no painel ao lado<br/>e o site aparece aqui.
                      </p>
                    </div>
                  </div>
              }
            </div>
          )}

          {/* ── CONTEÚDO: PAINEL ADMIN ── */}
          {rightTab === "admin" && (
            <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

              {/* Sidebar de seções */}
              <div style={{ width:160, borderRight:`1px solid ${BOR}`, background:SUR, display:"flex", flexDirection:"column", paddingTop:8 }}>
                {([
                  { id:"agente",   emoji:"🤖", label:"Agente de IA"  },
                  { id:"artigos",  emoji:"📝", label:"Artigos"        },
                  { id:"fotos",    emoji:"🖼️", label:"Fotos"          },
                  { id:"videos",   emoji:"🎥", label:"Vídeos"         },
                  { id:"publicar", emoji:"🚀", label:"Publicar"       },
                ] as const).map(sec => (
                  <button key={sec.id} onClick={() => setAdminSection(sec.id)}
                    style={{
                      display:"flex", alignItems:"center", gap:8, padding:"11px 16px",
                      border:"none", background: adminSection===sec.id ? `rgba(124,58,237,.12)` : "transparent",
                      cursor:"pointer", textAlign:"left",
                      borderLeft: adminSection===sec.id ? `3px solid ${A}` : "3px solid transparent",
                      color: adminSection===sec.id ? TX : MU,
                      fontSize:12, fontWeight: adminSection===sec.id ? 700 : 400,
                      transition:"all .15s",
                    }}>
                    <span style={{ fontSize:15 }}>{sec.emoji}</span> {sec.label}
                  </button>
                ))}
              </div>

              {/* Área de conteúdo do admin */}
              <div style={{ flex:1, overflowY:"auto", padding:24 }}>

                {/* ── Agente de IA ── */}
                {adminSection === "agente" && (
                  <div className="fi">
                    <p style={{ fontSize:15, fontWeight:800, color:TX, marginBottom:4, letterSpacing:"-0.02em" }}>Agente de IA</p>
                    <p style={{ fontSize:12, color:MU, marginBottom:20, lineHeight:1.6 }}>Configure o atendente virtual que vai responder visitantes do site pelo widget de voz e WhatsApp.</p>

                    {agSaved ? (
                      <div style={{ textAlign:"center", padding:"40px 0" }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                        <p style={{ fontSize:15, fontWeight:700, color:TX, marginBottom:6 }}>Agente salvo!</p>
                        <p style={{ fontSize:12, color:MU, lineHeight:1.7, marginBottom:20 }}>
                          Para conectar ao WhatsApp e ver métricas,<br/>acesse o Painel completo.
                        </p>
                        <button onClick={() => router.push("/voxshell/painel")}
                          style={{ padding:"10px 20px", borderRadius:10, background:A, color:"white", border:"none", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                          Ir para o Painel →
                        </button>
                      </div>
                    ) : (
                      <>
                        <label style={adminLabel}>Nome do Agente</label>
                        <input value={agName} onChange={e => setAgName(e.target.value)}
                          placeholder="Ex: Atendente da Clínica Saúde"
                          style={adminInput} />

                        <label style={adminLabel}>Personalidade / Como deve se comportar</label>
                        <textarea value={agPers} onChange={e => setAgPers(e.target.value)} rows={8}
                          placeholder={`Ex: "Você é a atendente virtual da Clínica Saúde. Responda com simpatia, tire dúvidas sobre serviços, horários e preços. Não forneça diagnósticos. Quando o cliente quiser agendar, colete nome, serviço e data preferida."`}
                          style={{ ...adminInput, resize:"vertical", lineHeight:1.6, minHeight:180, marginBottom:16 }} />

                        <div style={{ background:"rgba(124,58,237,.06)", border:`1px solid rgba(124,58,237,.15)`, borderRadius:10, padding:"12px 14px", marginBottom:20, fontSize:12, color:"#a78bfa", lineHeight:1.6 }}>
                          💡 Quanto mais detalhado o prompt, melhor o atendente performa. Diga o que ele pode e não pode falar, qual é a missão e como conduzir o cliente até a conversão.
                        </div>

                        <button onClick={saveAgent} disabled={agSaving || !agName.trim() || !agPers.trim()}
                          style={{ padding:"13px 24px", borderRadius:10, fontSize:14, fontWeight:700,
                            background:A, color:"white", border:"none", cursor:"pointer",
                            opacity: agSaving || !agName.trim() || !agPers.trim() ? .45 : 1 }}>
                          {agSaving ? "Salvando..." : "Salvar Agente"}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ── Artigos ── */}
                {adminSection === "artigos" && (
                  <div className="fi">
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <p style={{ fontSize:15, fontWeight:800, color:TX, letterSpacing:"-0.02em" }}>Artigos</p>
                      <button onClick={() => setArtigos([...artigos, { titulo:"", texto:"" }])} style={adminAddBtn}>+ Novo artigo</button>
                    </div>
                    <p style={{ fontSize:12, color:MU, marginBottom:20, lineHeight:1.6 }}>Adicione textos, posts e informações que devem aparecer no site.</p>

                    {artigos.length === 0 && (
                      <div style={{ textAlign:"center", padding:"40px 0", color:MU }}>
                        <div style={{ fontSize:36, marginBottom:12 }}>📝</div>
                        <p style={{ fontSize:13 }}>Nenhum artigo ainda.</p>
                        <p style={{ fontSize:12, marginTop:6 }}>Clique em "+ Novo artigo" para começar.</p>
                      </div>
                    )}

                    {artigos.map((a, i) => (
                      <div key={i} style={{ background:SUR, border:`1px solid ${BOR}`, borderRadius:10, padding:16, marginBottom:12 }}>
                        <label style={adminLabel}>Título</label>
                        <input value={a.titulo} onChange={e => { const n=[...artigos]; n[i]={...n[i],titulo:e.target.value}; setArtigos(n); }}
                          placeholder="Título do artigo" style={adminInput} />
                        <label style={adminLabel}>Conteúdo</label>
                        <textarea value={a.texto} onChange={e => { const n=[...artigos]; n[i]={...n[i],texto:e.target.value}; setArtigos(n); }}
                          rows={4} placeholder="Escreva o conteúdo aqui..."
                          style={{ ...adminInput, resize:"vertical", lineHeight:1.6 }} />
                        <button onClick={() => setArtigos(artigos.filter((_,j)=>j!==i))}
                          style={{ fontSize:11, color:ER, background:"none", border:"none", cursor:"pointer" }}>
                          ✕ Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Fotos ── */}
                {adminSection === "fotos" && (
                  <div className="fi">
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <p style={{ fontSize:15, fontWeight:800, color:TX, letterSpacing:"-0.02em" }}>Fotos</p>
                      <button onClick={() => setFotos([...fotos, { url:"", legenda:"" }])} style={adminAddBtn}>+ Nova foto</button>
                    </div>
                    <p style={{ fontSize:12, color:MU, marginBottom:20, lineHeight:1.6 }}>Cole URLs de imagens que devem aparecer no site.</p>

                    {fotos.length === 0 && (
                      <div style={{ textAlign:"center", padding:"40px 0", color:MU }}>
                        <div style={{ fontSize:36, marginBottom:12 }}>🖼️</div>
                        <p style={{ fontSize:13 }}>Nenhuma foto ainda.</p>
                        <p style={{ fontSize:12, marginTop:6 }}>Clique em "+ Nova foto" para começar.</p>
                      </div>
                    )}

                    {fotos.map((f, i) => (
                      <div key={i} style={{ background:SUR, border:`1px solid ${BOR}`, borderRadius:10, padding:16, marginBottom:12 }}>
                        <label style={adminLabel}>URL da imagem</label>
                        <input value={f.url} onChange={e => { const n=[...fotos]; n[i]={...n[i],url:e.target.value}; setFotos(n); }}
                          placeholder="https://..." style={adminInput} />
                        {f.url && <img src={f.url} alt="" style={{ width:"100%", height:140, objectFit:"cover", borderRadius:8, marginBottom:10 }} onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />}
                        <label style={adminLabel}>Legenda (opcional)</label>
                        <input value={f.legenda} onChange={e => { const n=[...fotos]; n[i]={...n[i],legenda:e.target.value}; setFotos(n); }}
                          placeholder="Ex: Fachada do estabelecimento" style={adminInput} />
                        <button onClick={() => setFotos(fotos.filter((_,j)=>j!==i))}
                          style={{ fontSize:11, color:ER, background:"none", border:"none", cursor:"pointer" }}>
                          ✕ Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Vídeos ── */}
                {adminSection === "videos" && (
                  <div className="fi">
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                      <p style={{ fontSize:15, fontWeight:800, color:TX, letterSpacing:"-0.02em" }}>Vídeos</p>
                      <button onClick={() => setVideos([...videos, { url:"", legenda:"" }])} style={adminAddBtn}>+ Novo vídeo</button>
                    </div>
                    <p style={{ fontSize:12, color:MU, marginBottom:20, lineHeight:1.6 }}>Cole links do YouTube ou URLs diretas de vídeos para o site.</p>

                    {videos.length === 0 && (
                      <div style={{ textAlign:"center", padding:"40px 0", color:MU }}>
                        <div style={{ fontSize:36, marginBottom:12 }}>🎥</div>
                        <p style={{ fontSize:13 }}>Nenhum vídeo ainda.</p>
                        <p style={{ fontSize:12, marginTop:6 }}>Clique em "+ Novo vídeo" para começar.</p>
                      </div>
                    )}

                    {videos.map((v, i) => (
                      <div key={i} style={{ background:SUR, border:`1px solid ${BOR}`, borderRadius:10, padding:16, marginBottom:12 }}>
                        <label style={adminLabel}>URL do vídeo</label>
                        <input value={v.url} onChange={e => { const n=[...videos]; n[i]={...n[i],url:e.target.value}; setVideos(n); }}
                          placeholder="https://youtube.com/... ou link direto" style={adminInput} />
                        <label style={adminLabel}>Legenda (opcional)</label>
                        <input value={v.legenda} onChange={e => { const n=[...videos]; n[i]={...n[i],legenda:e.target.value}; setVideos(n); }}
                          placeholder="Ex: Tour pelo espaço" style={adminInput} />
                        <button onClick={() => setVideos(videos.filter((_,j)=>j!==i))}
                          style={{ fontSize:11, color:ER, background:"none", border:"none", cursor:"pointer" }}>
                          ✕ Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Publicar ── */}
                {adminSection === "publicar" && (
                  <div className="fi">
                    <p style={{ fontSize:15, fontWeight:800, color:TX, marginBottom:4, letterSpacing:"-0.02em" }}>Publicar Site</p>
                    <p style={{ fontSize:12, color:MU, marginBottom:24, lineHeight:1.6 }}>Coloque seu site no ar com uma URL pública. O widget de atendimento por voz é embutido automaticamente.</p>

                    {!hasSite ? (
                      <div style={{ textAlign:"center", padding:"40px 0", color:MU }}>
                        <div style={{ fontSize:36, marginBottom:12 }}>🏗️</div>
                        <p style={{ fontSize:13 }}>Nenhum site gerado ainda.</p>
                        <p style={{ fontSize:12, marginTop:6 }}>Peça ao VoxShell para criar um site no chat ao lado.</p>
                      </div>
                    ) : deployUrl ? (
                      <>
                        <div style={{ background:"rgba(34,197,94,.08)", border:`1px solid rgba(34,197,94,.2)`, borderRadius:12, padding:20, marginBottom:20, textAlign:"center" }}>
                          <p style={{ fontSize:24, marginBottom:8 }}>🎉</p>
                          <p style={{ fontSize:14, fontWeight:700, color:OK, marginBottom:8 }}>Site publicado com sucesso!</p>
                          <p style={{ fontSize:12, color:MU, wordBreak:"break-all", lineHeight:1.6 }}>{deployUrl}</p>
                        </div>
                        <a href={deployUrl} target="_blank" rel="noopener noreferrer"
                          style={{ display:"block", padding:"13px 24px", borderRadius:10, fontSize:14, fontWeight:700, background:OK, color:"white", textDecoration:"none", textAlign:"center", marginBottom:10 }}>
                          ↗ Abrir site publicado
                        </a>
                        <button onClick={deploy} disabled={deploying}
                          style={{ display:"block", width:"100%", padding:"13px 24px", borderRadius:10, fontSize:13, fontWeight:600, background:"transparent", color:MU, border:`1px solid ${BOR}`, cursor:"pointer" }}>
                          {deploying ? "Republicando..." : "↺ Republicar com atualizações"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ background:`rgba(124,58,237,.06)`, border:`1px solid rgba(124,58,237,.15)`, borderRadius:12, padding:16, marginBottom:24 }}>
                          <p style={{ fontSize:12, fontWeight:700, color:A, marginBottom:8 }}>O que acontece ao publicar:</p>
                          <ul style={{ fontSize:12, color:MU, lineHeight:2, paddingLeft:16 }}>
                            <li>Site vai ao ar com URL pública instantânea</li>
                            <li>Widget de atendimento por voz é embutido</li>
                            <li>Visitantes podem falar com o agente de IA</li>
                            <li>Leads são capturados automaticamente</li>
                          </ul>
                        </div>
                        <button onClick={deploy} disabled={deploying}
                          style={{ padding:"14px 32px", borderRadius:10, fontSize:14, fontWeight:700,
                            background: deploying ? MU : A, color:"white", border:"none", cursor:"pointer" }}>
                          {deploying ? "Publicando..." : "⬆ Publicar Site Agora"}
                        </button>
                        {!agSaved && (
                          <p style={{ fontSize:11, color:MU, marginTop:14, lineHeight:1.6 }}>
                            Dica: configure o Agente de IA antes de publicar para que o widget de voz funcione.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
