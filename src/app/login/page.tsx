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
      setMessage("Pagamento confirmado! Faça login para acessar o JOW.");
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
      style={{ background: "radial-gradient(ellipse at center, #0D0520 0%, #060610 60%, #0A0A0F 100%)" }}
    >
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold tracking-[0.5em] text-purple-300"
            style={{ textShadow: "0 0 30px rgba(192,132,252,0.5)" }}>
            JOW
          </h1>
          <p className="text-xs tracking-widest text-purple-600 mt-2 uppercase">Assistente de IA Pessoal</p>
        </div>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-purple-900/30 border border-purple-700/50 text-purple-300 text-sm text-center">
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
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-purple-700 outline-none focus:ring-1 focus:ring-purple-500"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-purple-700 outline-none focus:ring-1 focus:ring-purple-500"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
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
              background: "linear-gradient(135deg, #6D28D9, #7C3AED)",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-purple-700 text-xs mt-6">
          Não tem conta?{" "}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 underline">
            Assinar o JOW
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
