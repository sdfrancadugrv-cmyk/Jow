"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (form.password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar conta.");
        return;
      }

      // Redireciona para o Stripe Checkout
      window.location.href = data.checkoutUrl;
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
          <p className="text-xs tracking-widest text-purple-600 mt-2 uppercase">Criar conta — R$97/mês</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { field: "name", type: "text", placeholder: "Seu nome" },
            { field: "email", type: "email", placeholder: "Seu e-mail" },
            { field: "password", type: "password", placeholder: "Criar senha (mín. 6 caracteres)" },
            { field: "confirm", type: "password", placeholder: "Confirmar senha" },
          ].map(({ field, type, placeholder }) => (
            <input
              key={field}
              type={type}
              placeholder={placeholder}
              value={form[field as keyof typeof form]}
              onChange={(e) => set(field, e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-purple-700 outline-none focus:ring-1 focus:ring-purple-500"
              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)" }}
            />
          ))}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white text-sm tracking-wider uppercase transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6D28D9, #7C3AED)",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            {loading ? "Redirecionando para pagamento..." : "Continuar para pagamento →"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-purple-800 text-xs">🔒 Pagamento seguro via Stripe · Cancele quando quiser</p>
        </div>

        <p className="text-center text-purple-700 text-xs mt-4">
          Já tem conta?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 underline">
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  );
}
