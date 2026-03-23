"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (params.get("payment") === "success") {
      setMessage("Pagamento confirmado! Faça login para acessar o KADOSH.");
    }
    if (params.get("expired") === "true") {
      setMessage("Sua assinatura expirou. Renove para continuar.");
    }
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "DEVICE_LIMIT") {
          setError("Limite de 2 dispositivos atingido. Entre em contato para gerenciar seus dispositivos.");
        } else {
          setError(data.error || "Erro ao fazer login.");
        }
        return;
      }

      router.push("/app");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #100810 0%, #060608 60%, #080810 100%)" }}
    >
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold tracking-[0.5em]"
            style={{ color: "#E0D4D0", textShadow: "0 0 30px rgba(139,26,46,0.5)" }}>
            KADOSH
          </h1>
          <p className="text-xs tracking-widest mt-2 uppercase" style={{ color: "#7A4040" }}>Assistente de IA Pessoal</p>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-center" style={{ background: "rgba(139,26,46,0.15)", border: "1px solid rgba(139,26,46,0.4)", color: "#E0D4D0" }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-[#5A3030] outline-none focus:ring-1 focus:ring-[#8B1A2E]"
              style={{ background: "rgba(139,26,46,0.1)", border: "1px solid rgba(139,26,46,0.3)" }}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-[#5A3030] outline-none focus:ring-1 focus:ring-[#8B1A2E]"
              style={{ background: "rgba(139,26,46,0.1)", border: "1px solid rgba(139,26,46,0.3)" }}
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white text-sm tracking-wider uppercase transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6B1520, #8B1A2E)",
              boxShadow: "0 0 20px rgba(139,26,46,0.4)",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#5A3030" }}>
          Não tem conta?{" "}
          <Link href="/register" className="underline" style={{ color: "#C4A8A4" }}>
            Assinar o KADOSH
          </Link>
        </p>
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
