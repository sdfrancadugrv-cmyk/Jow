import Link from "next/link";

export default function LandingPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)",
      }}
    >
      {/* Névoa azul-cinza — lado esquerdo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%),
            radial-gradient(ellipse 80% 30% at 50% 80%, rgba(8,12,30,0.6) 0%, transparent 70%)
          `,
        }}
      />

      {/* Partículas douradas */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.s,
              height: p.s,
              background: `rgba(212,170,0,${p.o})`,
              boxShadow: `0 0 ${p.s * 2}px rgba(212,170,0,${p.o * 0.8})`,
              animation: `twinkle ${p.d}s ease-in-out ${p.delay}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 select-none">

        {/* Título */}
        <h1
          className="font-bold tracking-[0.35em] leading-none mb-2"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(3.5rem, 12vw, 7rem)",
            background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 24px rgba(212,160,23,0.7)) drop-shadow(0 0 60px rgba(212,160,23,0.3))",
          }}
        >
          KADOSH
        </h1>

        {/* Subtítulo */}
        <p
          className="text-xs tracking-[0.55em] mb-14 uppercase"
          style={{ color: "#7A6010", letterSpacing: "0.55em" }}
        >
          — AI ORCHESTRATOR —
        </p>

        {/* Microfone com anéis — clicável vai pro registro */}
        <Link
          href="/register"
          className="relative flex items-center justify-center mb-14 cursor-pointer"
          style={{ width: 220, height: 220 }}
        >
          {/* Anéis radiantes */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 90 + i * 38,
                height: 90 + i * 38,
                border: `1.5px solid rgba(212,160,23,${0.55 - i * 0.1})`,
                boxShadow: `0 0 ${8 + i * 4}px rgba(212,160,23,${0.25 - i * 0.04})`,
                animation: `ringPulse 2.4s ease-out ${i * 0.4}s infinite`,
              }}
            />
          ))}

          {/* Círculo central dourado */}
          <div
            className="absolute rounded-full"
            style={{
              width: 100,
              height: 100,
              background:
                "radial-gradient(circle at 38% 35%, #FFE57A, #D4A017 50%, #7A5A00 100%)",
              boxShadow:
                "0 0 40px rgba(212,160,23,0.8), 0 0 80px rgba(212,160,23,0.35), inset 0 0 20px rgba(255,230,100,0.2)",
            }}
          />

          {/* SVG Microfone */}
          <svg
            className="relative z-10"
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
          >
            {/* Corpo do microfone */}
            <rect x="18" y="4" width="16" height="26" rx="8" fill="url(#micGrad)" />
            {/* Suporte */}
            <path
              d="M10 26c0 8.837 7.163 16 16 16s16-7.163 16-16"
              stroke="url(#micGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Haste */}
            <line x1="26" y1="42" x2="26" y2="48" stroke="url(#micGrad)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Base */}
            <line x1="18" y1="48" x2="34" y2="48" stroke="url(#micGrad)" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="micGrad" x1="26" y1="4" x2="26" y2="52" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFE082" />
                <stop offset="50%" stopColor="#D4A017" />
                <stop offset="100%" stopColor="#7A5A00" />
              </linearGradient>
            </defs>
          </svg>
        </Link>

        {/* Tagline */}
        <p
          className="text-base md:text-lg mb-10 max-w-sm leading-relaxed"
          style={{ color: "#C8CDD8" }}
        >
          Ordene seus 300 agentes de IA e conquiste sua missão.
        </p>

        {/* CTA */}
        <Link
          href="/register"
          className="px-14 py-4 rounded-full font-bold text-sm tracking-widest uppercase transition-transform hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
            color: "#0A0808",
            boxShadow:
              "0 0 30px rgba(218,165,32,0.65), 0 4px 20px rgba(0,0,0,0.4)",
            letterSpacing: "0.2em",
          }}
        >
          COMANDAR AGORA
        </Link>

        {/* Login link discreto */}
        <Link
          href="/login"
          className="mt-8 text-xs tracking-widest uppercase transition-opacity hover:opacity-80"
          style={{ color: "#4A3A08", letterSpacing: "0.2em" }}
        >
          Já tenho acesso
        </Link>
      </div>

      <style>{`
        @keyframes twinkle {
          from { opacity: 0.2; transform: scale(0.8); }
          to   { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes ringPulse {
          0%   { transform: scale(1);   opacity: 1; }
          70%  { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </main>
  );
}

// Partículas geradas deterministicamente para SSR
function pr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
const PARTICLES = Array.from({ length: 80 }, (_, i) => ({
  x: pr(i * 7.3) * 100,
  y: pr(i * 3.7) * 100,
  s: 1 + pr(i * 11.1) * 2.5,
  o: 0.25 + pr(i * 5.9) * 0.65,
  d: 2 + pr(i * 2.3) * 3,
  delay: pr(i * 1.7) * 4,
}));
