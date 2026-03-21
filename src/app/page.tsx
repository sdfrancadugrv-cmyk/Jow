import Link from "next/link";

const FEATURES = [
  {
    icon: "🎙️",
    title: "Voz Natural",
    desc: 'Fale "JOW" e ele responde. Sem apertar botão. Igual ao Jarvis do Homem de Ferro.',
  },
  {
    icon: "🧠",
    title: "Memória Permanente",
    desc: "Lembra de tudo que você já conversou. Cada sessão começa de onde parou.",
  },
  {
    icon: "⚡",
    title: "Agentes Especializados",
    desc: "Analista, Dev, Arquiteto, QA, PM e UX trabalhando em paralelo nas suas demandas.",
  },
  {
    icon: "🌐",
    title: "Internet em Tempo Real",
    desc: "Pesquisa e traz informações atualizadas direto na conversa, sem você precisar pedir.",
  },
];

export default function LandingPage() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: "radial-gradient(ellipse at center, #0D0520 0%, #060610 50%, #0A0A0F 100%)" }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-5xl mx-auto w-full">
        <span className="text-2xl font-bold tracking-[0.4em] text-purple-300">JOW</span>
        <Link
          href="/login"
          className="text-xs tracking-widest uppercase text-purple-400 hover:text-purple-200 transition-colors"
        >
          Entrar
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
          style={{
            background: "linear-gradient(135deg, #4C1D95, #7C3AED)",
            boxShadow: "0 0 60px rgba(124,58,237,0.5), 0 0 120px rgba(124,58,237,0.15)",
          }}
        >
          <span className="text-4xl">🎙️</span>
        </div>

        <h1
          className="text-6xl md:text-7xl font-bold tracking-[0.3em] text-purple-200 mb-4"
          style={{ textShadow: "0 0 40px rgba(192,132,252,0.4)" }}
        >
          JOW
        </h1>

        <p className="text-xl text-purple-400 mb-3 max-w-lg">
          Seu assistente de IA pessoal com voz, memória e agentes especializados.
        </p>
        <p className="text-sm text-purple-700 mb-10 max-w-md">
          Fala com ele como se fosse um humano. Ele executa tarefas, pesquisa na internet e lembra de tudo.
        </p>

        <Link
          href="/register"
          className="px-10 py-4 rounded-full text-white font-bold text-sm tracking-widest uppercase transition-all hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #6D28D9, #7C3AED)",
            boxShadow: "0 0 30px rgba(124,58,237,0.5)",
          }}
        >
          Começar por R$97/mês →
        </Link>

        <p className="text-xs text-purple-800 mt-4">Cancele quando quiser · Sem fidelidade</p>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-xl"
              style={{
                background: "rgba(124,58,237,0.06)",
                border: "1px solid rgba(124,58,237,0.2)",
              }}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-purple-200 font-semibold mb-2">{f.title}</h3>
              <p className="text-purple-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 pb-24 flex justify-center">
        <div
          className="w-full max-w-sm p-8 rounded-2xl text-center"
          style={{
            background: "rgba(124,58,237,0.08)",
            border: "1px solid rgba(124,58,237,0.35)",
            boxShadow: "0 0 40px rgba(124,58,237,0.15)",
          }}
        >
          <p className="text-purple-500 text-xs tracking-widest uppercase mb-3">Plano único</p>
          <div className="flex items-end justify-center gap-1 mb-1">
            <span className="text-purple-400 text-lg">R$</span>
            <span className="text-white text-6xl font-bold">97</span>
            <span className="text-purple-500 mb-2">/mês</span>
          </div>
          <p className="text-purple-600 text-xs mb-6">Recorrente · Cancele quando quiser</p>
          <ul className="text-left text-sm text-purple-400 space-y-2 mb-8">
            {["Acesso completo ao JOW", "Voz, memória e agentes de IA", "Atualizações automáticas incluídas", "Até 2 dispositivos por conta", "Suporte por e-mail"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-purple-500">✓</span> {item}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="block w-full py-3 rounded-full text-white font-bold text-sm tracking-widest uppercase transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #6D28D9, #7C3AED)",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            Assinar agora →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="pb-8 text-center">
        <p className="text-[10px] tracking-widest text-purple-900 uppercase">
          JOW AI · Powered by GPT-4o
        </p>
      </footer>
    </main>
  );
}
