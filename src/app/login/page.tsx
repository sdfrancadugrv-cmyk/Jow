"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("payment") === "success") {
      setMessage("Pagamento confirmado! Faça login para acessar o Jennifer.");
    }
    if (params.get("expired") === "true") {
      setMessage("Sua assinatura expirou. Renove para continuar.");
    }
  }, [params]);

  const handleLogin = useCallback(async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) { setError("Digite um número de WhatsApp válido"); return; }
    const clean = "55" + digits;
    if (!password) { setError("Digite sua senha"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao fazer login"); setLoading(false); return; }
      router.push(data.isAdmin ? "/admin" : "/app");
    } catch {
      setError("Erro de conexão"); setLoading(false);
    }
  }, [phone, password, router]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 35%, #0C1526 0%, #070B18 45%, #020408 100%)" }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 70% 55% at 10% 50%, rgba(28,45,90,0.45) 0%, transparent 65%),
          radial-gradient(ellipse 55% 45% at 90% 45%, rgba(18,28,70,0.35) 0%, transparent 65%)
        `,
      }} />

      <div className="relative z-10 w-full max-w-sm px-6">

        <div className="text-center mb-10">
          <h1 className="font-bold tracking-[0.35em] leading-none mb-2" style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: "clamp(2.5rem, 10vw, 4rem)",
            background: "linear-gradient(180deg, #FFE082 0%, #D4A017 50%, #A07010 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 20px rgba(212,160,23,0.6))",
          }}>
            JENNIFER
          </h1>
          <p className="text-xs tracking-[0.4em] uppercase" style={{ color: "#7A6010" }}>
            — AI ORCHESTRATOR —
          </p>
        </div>

        {message && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm text-center" style={{
            background: "rgba(212,160,23,0.1)",
            border: "1px solid rgba(212,160,23,0.3)",
            color: "#FFE082",
          }}>
            {message}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <p className="text-sm text-center" style={{ color: "#C8CDD8" }}>
            Entre com seu WhatsApp e senha
          </p>

          <div className="flex items-center rounded-full overflow-hidden" style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(212,160,23,0.35)",
          }}>
            <span className="px-4 py-3 text-sm font-bold select-none" style={{ color: "#FFE082", borderRight: "1px solid rgba(212,160,23,0.25)" }}>
              +55
            </span>
            <input
              type="tel"
              placeholder="99 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-4 py-3 text-sm text-center outline-none bg-transparent"
              style={{ color: "#FFE082" }}
            />
          </div>

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-3 rounded-full text-sm text-center outline-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(212,160,23,0.35)",
              color: "#FFE082",
            }}
          />

          {error && <p className="text-center text-sm" style={{ color: "#F97316" }}>{error}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-full font-bold text-sm tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #C8900A, #E8B020, #C8900A)",
              color: "#0A0808",
              boxShadow: "0 0 24px rgba(218,165,32,0.5)",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-center text-xs mt-2" style={{ color: "#4A3A08" }}>
            Não tem conta?{" "}
            <a href="/" style={{ color: "#7A6010", textDecoration: "underline" }}>
              Conheça o Jennifer
            </a>
          </p>

          <p className="text-center text-xs">
            <a href="/" style={{ color: "#3A2C06" }}>← Voltar ao início</a>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
