"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";

const GOLD       = "#D4A017";
const GOLD_LIGHT = "#FFE082";
const BG         = "#070B18";
const LABEL      = "#A08030";
const MUTED      = "#7A6018";

type Estado = "aguardando" | "falando" | "ouvindo" | "processando";

interface Mensagem {
  role: "user" | "assistant";
  content: string;
}

export default function ProfessorChatPage() {
  const router       = useRouter();
  const params       = useParams();
  const searchParams = useSearchParams();
  const plano        = params?.plano as string;

  // Parâmetros de avaliação (vindos da tela /testar)
  const formatoAvaliacao  = searchParams?.get("formato") || null;
  const materiasAvaliacao = searchParams?.get("materias")?.split("|").filter(Boolean) || [];

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [estado,    setEstado]    = useState<Estado>("aguardando");
  const [textoAtual, setTextoAtual] = useState("");
  const [pdfTexto,  setPdfTexto]  = useState<string | null>(null);
  const [pdfNome,   setPdfNome]   = useState<string | null>(null);
  const [uploadando,   setUploadando]   = useState(false);
  const [iniciado,     setIniciado]     = useState(false);
  const [encerrando,   setEncerrando]   = useState(false);
  const [resumoPronto, setResumoPronto] = useState<string | null>(null);
  const [configAluno,  setConfigAluno]  = useState<any>(null);

  const mensagensRef   = useRef<Mensagem[]>([]);
  const pdfTextoRef    = useRef<string | null>(null);
  const textoAtualRef  = useRef<string>("");
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fila de áudio
  const audioQueue    = useRef<string[]>([]);
  const tocandoRef    = useRef(false);
  const audioAtual    = useRef<HTMLAudioElement | null>(null);
  const onFimAudio    = useRef<(() => void) | null>(null);
  const interrompido  = useRef(false);
  const ttsPendentes  = useRef(0); // quantas chamadas TTS ainda não voltaram

  useEffect(() => { mensagensRef.current  = mensagens;  }, [mensagens]);
  useEffect(() => { pdfTextoRef.current   = pdfTexto;   }, [pdfTexto]);
  useEffect(() => { textoAtualRef.current = textoAtual; }, [textoAtual]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, textoAtual]);

  // Carrega config do aluno ao montar
  useEffect(() => {
    fetch("/api/professor/config")
      .then(r => r.json())
      .then(d => { if (d.config) setConfigAluno({ ...d.config, plano }); })
      .catch(() => {});
  }, [plano]);

  // ─── ÁUDIO ───────────────────────────────────────────────────────────────────

  const tocarFila = useCallback(() => {
    if (interrompido.current || tocandoRef.current || audioQueue.current.length === 0) return;
    tocandoRef.current = true;
    const base64 = audioQueue.current.shift()!;
    const audio  = new Audio(`data:audio/mp3;base64,${base64}`);
    audioAtual.current = audio;

    audio.onended = () => {
      audioAtual.current = null;
      tocandoRef.current = false;
      if (interrompido.current) return;
      if (audioQueue.current.length > 0) {
        tocarFila();
      } else if (ttsPendentes.current === 0 && onFimAudio.current) {
        // Só dispara onFimAudio quando não há mais TTS em flight
        onFimAudio.current();
        onFimAudio.current = null;
      }
    };
    audio.onerror = () => {
      audioAtual.current = null;
      tocandoRef.current = false;
      tocarFila();
    };
    audio.play().catch(() => { tocandoRef.current = false; tocarFila(); });
  }, []);

  function pararAudio() {
    interrompido.current = true;
    if (audioAtual.current) { audioAtual.current.pause(); audioAtual.current = null; }
    audioQueue.current = [];
    tocandoRef.current = false;
    onFimAudio.current = null;
    ttsPendentes.current = 0;
  }

  const enfileirarTTS = useCallback(async (frase: string) => {
    if (interrompido.current || !frase.trim()) return;
    ttsPendentes.current++;
    try {
      const res  = await fetch("/api/professor/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: frase }),
      });
      const data = await res.json();
      if (data.audio && !interrompido.current) {
        audioQueue.current.push(data.audio);
        tocarFila();
      }
    } catch {
    } finally {
      ttsPendentes.current--;
      // Se era o último TTS e o áudio já parou, dispara onFimAudio agora
      if (ttsPendentes.current === 0 && audioQueue.current.length === 0 && !tocandoRef.current && !interrompido.current) {
        if (onFimAudio.current) {
          onFimAudio.current();
          onFimAudio.current = null;
        }
      }
    }
  }, [tocarFila]);

  // ─── MICROFONE — só liga depois que o áudio para ──────────────────────────

  const ouvirAluno = useCallback((onTexto: (t: string) => void) => {
    // Garante que nenhum áudio está tocando antes de ligar o mic
    if (tocandoRef.current || audioQueue.current.length > 0) return;

    setEstado("ouvindo");
    interrompido.current = false;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setEstado("aguardando"); return; }

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const texto = e.results[0][0].transcript.trim();
      if (texto) onTexto(texto);
      else ouvirAluno(onTexto);
    };
    rec.onerror = () => setEstado("aguardando");
    rec.start();
  }, []);

  // ─── ENVIAR MENSAGEM ──────────────────────────────────────────────────────

  const enviarMensagem = useCallback(async (texto: string) => {
    pararAudio();
    interrompido.current = false;
    setEstado("processando");

    // Salva no histórico qualquer explicação que estava sendo exibida
    let historicoBase = mensagensRef.current;
    const emFala = textoAtualRef.current.trim();
    if (emFala) {
      const comProfessor: Mensagem[] = [...historicoBase, { role: "assistant", content: emFala }];
      setMensagens(comProfessor);
      mensagensRef.current = comProfessor;
      historicoBase = comProfessor;
    }
    setTextoAtual("");
    textoAtualRef.current = "";

    const nova: Mensagem = { role: "user", content: texto };
    const historico = [...historicoBase, nova];
    setMensagens(historico);
    mensagensRef.current = historico;

    let streamCompleto = "";
    let buffer = "";

    function verificarFrase(flush = false) {
      const regex = /[^.!?]*[.!?]+(\s|$)/g;
      let match, ultimo = 0;
      while ((match = regex.exec(buffer)) !== null) {
        const frase = match[0].trim();
        if (frase.length > 10) enfileirarTTS(frase);
        ultimo = regex.lastIndex;
      }
      if (ultimo > 0) buffer = buffer.substring(ultimo);
      if (flush && buffer.trim().length > 5) {
        enfileirarTTS(buffer.trim());
        buffer = "";
      }
    }

    try {
      setEstado("falando");

      const res = await fetch("/api/professor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: historico.map(m => ({ role: m.role, content: m.content })),
          pdfTexto: pdfTextoRef.current,
          configAluno,
        }),
      });

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const linha of decoder.decode(value, { stream: true }).split("\n")) {
          if (!linha.startsWith("data: ")) continue;
          const payload = linha.slice(6).trim();
          if (payload === "[DONE]") { verificarFrase(true); break; }
          try {
            const { text } = JSON.parse(payload);
            if (text) {
              streamCompleto += text;
              buffer += text;
              textoAtualRef.current = streamCompleto;
              setTextoAtual(streamCompleto);
              verificarFrase();
            }
          } catch {}
        }
      }

      const textoFinal = streamCompleto;

      // Quando o áudio terminar → salva mensagem → liga mic com delay
      onFimAudio.current = () => {
        setTextoAtual("");
        textoAtualRef.current = "";
        setMensagens(prev => {
          const novo = [...prev, { role: "assistant" as const, content: textoFinal }];
          mensagensRef.current = novo;
          return novo;
        });
        // Delay para o som dissipar do ambiente antes de ligar o mic
        setTimeout(() => {
          if (!interrompido.current) ouvirAluno((fala) => enviarMensagem(fala));
        }, 1200);
      };

    } catch {
      setEstado("aguardando");
    }
  }, [enfileirarTTS, ouvirAluno]);

  // ─── INICIAR — professor fala primeiro ───────────────────────────────────

  const iniciar = useCallback(async () => {
    setIniciado(true);
    interrompido.current = false;
    setEstado("processando");
    setTextoAtual("");

    const nomesFormatos: Record<string, string> = {
      prova:    "Prova Oral",
      simulado: "Simulado com questões objetivas",
      redacao:  "Redação sobre o tema",
      trabalho: "Trabalho escrito",
    };

    const abertura = formatoAvaliacao && materiasAvaliacao.length > 0
      ? `O aluno quer ser avaliado. Formato da avaliação: ${nomesFormatos[formatoAvaliacao] || formatoAvaliacao}. Matérias selecionadas: ${materiasAvaliacao.join(", ")}. Apresente-se como Kadosh Professor, confirme o que será avaliado e inicie a avaliação imediatamente com postura técnica e exigente. Avalie com rigor, dê notas ou conceitos, e ao final dê um parecer completo do desempenho do aluno.`
      : "O aluno acabou de entrar na aula. Apresente-se brevemente como Kadosh Professor e faça exatamente estas duas perguntas: primeiro, o que ele quer aprender hoje. Segundo, se ele tem algum PDF, apostila, cronograma ou material disponível para que você ensine com base nesse conteúdo. Caso tenha, peça para enviar usando o botão de PDF na tela. Se não tiver material, você mesmo criará o roteiro.";

    let streamCompleto = "";
    let buffer = "";

    function verificarFrase(flush = false) {
      const regex = /[^.!?]*[.!?]+(\s|$)/g;
      let match, ultimo = 0;
      while ((match = regex.exec(buffer)) !== null) {
        const frase = match[0].trim();
        if (frase.length > 10) enfileirarTTS(frase);
        ultimo = regex.lastIndex;
      }
      if (ultimo > 0) buffer = buffer.substring(ultimo);
      if (flush && buffer.trim().length > 5) {
        enfileirarTTS(buffer.trim());
        buffer = "";
      }
    }

    try {
      setEstado("falando");

      const res = await fetch("/api/professor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: [{ role: "user", content: abertura }],
          pdfTexto: null,
          configAluno,
        }),
      });

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const linha of decoder.decode(value, { stream: true }).split("\n")) {
          if (!linha.startsWith("data: ")) continue;
          const payload = linha.slice(6).trim();
          if (payload === "[DONE]") { verificarFrase(true); break; }
          try {
            const { text } = JSON.parse(payload);
            if (text) {
              streamCompleto += text;
              buffer += text;
              textoAtualRef.current = streamCompleto;
              setTextoAtual(streamCompleto);
              verificarFrase();
            }
          } catch {}
        }
      }

      const textoFinal = streamCompleto;

      onFimAudio.current = () => {
        setTextoAtual("");
        textoAtualRef.current = "";
        const msgs: Mensagem[] = [{ role: "assistant", content: textoFinal }];
        setMensagens(msgs);
        mensagensRef.current = msgs;
        setTimeout(() => {
          if (!interrompido.current) ouvirAluno((fala) => enviarMensagem(fala));
        }, 1200);
      };

    } catch {
      setEstado("aguardando");
    }
  }, [enfileirarTTS, ouvirAluno, enviarMensagem]);

  // ─── LEVANTAR A MÃO — para o professor e ouve ────────────────────────────

  function levantarMao() {
    pararAudio();
    setTextoAtual("");
    setTimeout(() => ouvirAluno((fala) => enviarMensagem(fala)), 300);
  }

  // ─── UPLOAD PDF ───────────────────────────────────────────────────────────

  async function uploadPdf(file: File) {
    setUploadando(true);
    const form = new FormData();
    form.append("pdf", file);
    try {
      const res  = await fetch("/api/professor/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.texto) {
        setPdfTexto(data.texto);
        setPdfNome(data.nome);
        pdfTextoRef.current = data.texto;
        pararAudio();
        enviarMensagem(`Recebi o material "${data.nome}" com ${data.paginas} página(s). Estude e crie um roteiro de ensino.`);
      }
    } catch { alert("Erro ao processar o PDF."); }
    finally  { setUploadando(false); }
  }

  // ─── ENCERRAR AULA ────────────────────────────────────────────────────────

  const encerrarAula = useCallback(async () => {
    pararAudio();
    setEstado("aguardando");
    setTextoAtual("");
    setEncerrando(true);

    try {
      const res  = await fetch("/api/professor/resumo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: mensagensRef.current }),
      });
      const data = await res.json();
      const resumoGerado = data.resumo || null;
      if (resumoGerado) setResumoPronto(resumoGerado);

      // Salva a aula no banco silenciosamente
      fetch("/api/professor/salvar-aula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagens: mensagensRef.current,
          resumo: resumoGerado,
          plano,
        }),
      }).catch(() => {});
    } catch {
      alert("Erro ao gerar o resumo.");
    } finally {
      setEncerrando(false);
    }
  }, [plano]);

  function baixarPDF(resumo: string) {
    const doc  = new jsPDF({ unit: "mm", format: "a4" });
    const W    = doc.internal.pageSize.getWidth();
    const margem = 18;
    const largura = W - margem * 2;
    let y = 20;

    // Cabeçalho
    doc.setFontSize(22);
    doc.setTextColor(180, 130, 10);
    doc.text("KADOSH PROFESSOR", W / 2, y, { align: "center" });
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(120, 90, 20);
    doc.text("Resumo de Estudo", W / 2, y, { align: "center" });
    y += 3;
    doc.setDrawColor(180, 130, 10);
    doc.setLineWidth(0.5);
    doc.line(margem, y + 2, W - margem, y + 2);
    y += 10;

    // Conteúdo
    doc.setTextColor(30, 30, 30);
    const linhas = resumo.split("\n");
    for (const linha of linhas) {
      const txt = linha.trim();
      if (!txt) { y += 4; continue; }

      const ehTitulo = txt === txt.toUpperCase() && txt.length > 3;
      if (ehTitulo) {
        if (y > 250) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(150, 100, 0);
        doc.text(txt, margem, y);
        y += 7;
      } else {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        const wrapped = doc.splitTextToSize(txt, largura);
        for (const w of wrapped) {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(w, margem, y);
          y += 5.5;
        }
      }
    }

    // Rodapé
    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 120, 40);
      doc.text(`Gerado por Kadosh Professor — kadosh.app`, margem, 290);
      doc.text(`${i} / ${paginas}`, W - margem, 290, { align: "right" });
    }

    doc.save("resumo-kadosh.pdf");
  }

  // ─── LABELS ───────────────────────────────────────────────────────────────

  const labels: Record<Estado, string> = {
    aguardando:  "toque ▶ para começar",
    processando: "processando...",
    falando:     "kadosh está falando",
    ouvindo:     "ouvindo você...",
  };
  const cores: Record<Estado, string> = {
    aguardando:  MUTED,
    processando: LABEL,
    falando:     GOLD,
    ouvindo:     GOLD_LIGHT,
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px", borderBottom: "1px solid rgba(212,160,23,0.15)",
        background: "rgba(7,11,24,0.97)", position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => { pararAudio(); router.push("/aluno"); }}
          style={{ fontSize: 11, color: LABEL, letterSpacing: "0.1em", background: "none", border: "none", cursor: "pointer" }}>
          ← PAINEL
        </button>

        <div style={{ textAlign: "center" }}>
          <p style={{
            fontFamily: "Georgia, serif", fontSize: "0.95rem", letterSpacing: "0.2em",
            background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>KADOSH PROFESSOR</p>
          {pdfNome && <p style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>📄 {pdfNome}</p>}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadPdf(f); e.target.value = ""; }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadando || !iniciado}
            style={{ fontSize: 18, background: "none", border: "none", cursor: "pointer",
              opacity: (!iniciado || uploadando) ? 0.3 : (pdfTexto ? 1 : 0.6),
              color: pdfTexto ? GOLD : MUTED }} title="Enviar PDF">
            {uploadando ? "⏳" : "📄"}
          </button>
          {iniciado && !resumoPronto && (
            <button onClick={encerrarAula} disabled={encerrando}
              style={{ fontSize: 10, color: encerrando ? MUTED : "#c0392b", letterSpacing: "0.08em",
                background: "none", border: `1px solid ${encerrando ? "rgba(255,255,255,0.1)" : "rgba(192,57,43,0.4)"}`,
                borderRadius: 8, padding: "5px 10px", cursor: encerrando ? "default" : "pointer" }}>
              {encerrando ? "gerando..." : "ENCERRAR"}
            </button>
          )}
        </div>
      </div>

      {/* Tela de resumo */}
      {resumoPronto && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(7,11,24,0.97)",
          zIndex: 50, overflowY: "auto", padding: "24px 16px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <div style={{ maxWidth: 520, width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <p style={{
                fontFamily: "Georgia, serif", fontSize: "1.2rem", letterSpacing: "0.25em",
                background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>AULA ENCERRADA</p>
              <p style={{ color: LABEL, fontSize: 12, marginTop: 6 }}>Aqui está o resumo da sua aula</p>
            </div>

            <div style={{
              background: "rgba(212,160,23,0.05)", border: "1px solid rgba(212,160,23,0.2)",
              borderRadius: 16, padding: "20px 18px", marginBottom: 20,
              whiteSpace: "pre-wrap", color: "#c8b870", fontSize: 13, lineHeight: 1.75,
              fontFamily: "Georgia, serif",
            }}>
              {resumoPronto}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => baixarPDF(resumoPronto)} style={{
                width: "100%", padding: "16px", borderRadius: 14, border: "none",
                background: `linear-gradient(135deg, #A07010, ${GOLD}, #A07010)`,
                color: "#0A0808", fontWeight: 700, fontSize: "0.95rem",
                fontFamily: "Georgia, serif", letterSpacing: "0.15em", cursor: "pointer",
                boxShadow: `0 0 24px rgba(212,160,23,0.35)`,
              }}>
                ↓ BAIXAR PDF
              </button>
              <button onClick={() => router.push(`/aluno/${plano}/testar`)} style={{
                width: "100%", padding: "13px", borderRadius: 14,
                border: "1px solid rgba(212,160,23,0.3)", background: "rgba(212,160,23,0.06)",
                color: LABEL, fontSize: "0.85rem", fontFamily: "Georgia, serif",
                letterSpacing: "0.1em", cursor: "pointer",
              }}>
                🎯 testar conhecimento
              </button>
              <button onClick={() => router.push("/aluno")} style={{
                width: "100%", padding: "13px", borderRadius: 14,
                border: "1px solid rgba(212,160,23,0.1)", background: "transparent",
                color: MUTED, fontSize: "0.8rem", fontFamily: "Georgia, serif",
                letterSpacing: "0.1em", cursor: "pointer",
              }}>
                voltar ao painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px", paddingBottom: 200 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>

          {mensagens.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "82%", padding: "10px 14px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: msg.role === "user" ? `linear-gradient(135deg, #A07010, ${GOLD})` : "rgba(212,160,23,0.07)",
                border: msg.role === "assistant" ? "1px solid rgba(212,160,23,0.18)" : "none",
                color: msg.role === "user" ? "#0A0808" : GOLD_LIGHT,
                fontSize: 13.5, lineHeight: 1.6,
                fontFamily: msg.role === "assistant" ? "Georgia, serif" : "inherit",
                fontWeight: msg.role === "user" ? 600 : 400,
              }}>{msg.content}</div>
            </div>
          ))}

          {textoAtual && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{
                maxWidth: "82%", padding: "10px 14px",
                borderRadius: "14px 14px 14px 4px",
                background: "rgba(212,160,23,0.1)", border: "1px solid rgba(212,160,23,0.28)",
                color: GOLD_LIGHT, fontSize: 13.5, lineHeight: 1.6, fontFamily: "Georgia, serif",
              }}>
                <span style={{ color: GOLD, fontSize: 10, letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>▶ FALANDO</span>
                {textoAtual}<span style={{ opacity: 0.4, animation: "blink 1s infinite" }}>|</span>
              </div>
            </div>
          )}

          {estado === "processando" && !textoAtual && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "12px 18px", borderRadius: "14px 14px 14px 4px",
                background: "rgba(212,160,23,0.07)", border: "1px solid rgba(212,160,23,0.18)" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0,1,2].map(n => (
                    <div key={n} style={{ width: 7, height: 7, borderRadius: "50%", background: GOLD,
                      animation: `pulse 1.2s ease-in-out ${n*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Controles */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(7,11,24,0.97)", borderTop: "1px solid rgba(212,160,23,0.15)",
        padding: "14px 16px 28px", zIndex: 10,
      }}>
        <div style={{ maxWidth: 400, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>

          {/* Botões de avaliação — visíveis quando a aula está ativa */}
          {iniciado && !resumoPronto && (
            <div style={{ display: "flex", gap: 8, width: "100%" }}>
              {[
                { label: "📝 Prova",    msg: "Quero fazer uma prova sobre o conteúdo que estudamos até agora. Pode começar." },
                { label: "✏️ Redação",  msg: "Quero escrever uma redação sobre o tema que estamos estudando. Me dê o enunciado." },
                { label: "🎯 Simulado", msg: "Quero fazer um simulado com questões objetivas sobre o que aprendi. Pode começar." },
              ].map(({ label, msg }) => (
                <button
                  key={label}
                  onClick={() => {
                    pararAudio();
                    setTextoAtual("");
                    setTimeout(() => enviarMensagem(msg), 300);
                  }}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 11,
                    border: "1px solid rgba(212,160,23,0.25)",
                    background: "rgba(212,160,23,0.06)",
                    color: LABEL, cursor: "pointer",
                    letterSpacing: "0.04em", transition: "all 0.2s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <p style={{ color: cores[estado], fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", transition: "color 0.3s" }}>
            {labels[estado]}
          </p>

          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>

            {!iniciado ? (
              /* Botão iniciar */
              <button onClick={iniciar} style={{
                width: 80, height: 80, borderRadius: "50%", border: "none",
                background: `linear-gradient(135deg, #A07010, ${GOLD})`,
                color: "#0A0808", fontSize: 30, cursor: "pointer",
                boxShadow: `0 0 40px rgba(212,160,23,0.5)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>▶</button>
            ) : (
              <>
                {/* Indicador de estado */}
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: estado === "ouvindo"
                    ? `radial-gradient(circle, rgba(212,160,23,0.3), rgba(212,160,23,0.05))`
                    : "rgba(212,160,23,0.05)",
                  border: `2px solid ${estado === "ouvindo" ? GOLD_LIGHT : "rgba(212,160,23,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
                  boxShadow: estado === "ouvindo" ? `0 0 28px rgba(212,160,23,0.4)` : "none",
                  transition: "all 0.3s",
                }}>
                  {estado === "ouvindo" ? "🎙️" : estado === "falando" ? "🔊" : estado === "processando" ? "⏳" : "💤"}
                </div>

                {/* Levantar a mão */}
                <button onClick={levantarMao} disabled={estado !== "falando"}
                  style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "rgba(212,160,23,0.08)",
                    border: `2px solid ${estado === "falando" ? "rgba(212,160,23,0.5)" : "rgba(212,160,23,0.12)"}`,
                    fontSize: 26, cursor: estado === "falando" ? "pointer" : "default",
                    opacity: estado === "falando" ? 1 : 0.25,
                    boxShadow: estado === "falando" ? `0 0 20px rgba(212,160,23,0.3)` : "none",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }} title="Interromper o professor">✋</button>
              </>
            )}
          </div>

          {!iniciado && (
            <p style={{ color: MUTED, fontSize: 11, textAlign: "center", maxWidth: 260 }}>
              Toque em ▶ para começar. O professor fala e ouve automaticamente.
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </main>
  );
}
