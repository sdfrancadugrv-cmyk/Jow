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
      style={{ background: "radial-gradient(ellipse at center, #100810 0%, #060608 60%, #080810 100%)" }}
    >
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold tracking-[0.5em]"
            style={{ color: "#E0D4D0", textShadow: "0 0 30px rgba(139,26,46,0.5)" }}>
            KADOSH
          </h1>
          <p className="text-xs tracking-widest mt-2 uppercase" style={{ color: "#7A4040" }}>Criar conta — R$97/mês</p>
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
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-[#5A3030] outline-none focus:ring-1 focus:ring-[#8B1A2E]"
              style={{ background: "rgba(139,26,46,0.1)", border: "1px solid rgba(139,26,46,0.3)" }}
            />
          ))}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white text-sm tracking-wider uppercase transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #6B1520, #8B1A2E)",
              boxShadow: "0 0 20px rgba(139,26,46,0.4)",
            }}
          >
            {loading ? "Redirecionando para pagamento..." : "Continuar para pagamento →"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-xs" style={{ color: "#3A1818" }}>🔒 Pagamento seguro via Stripe · Cancele quando quiser</p>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#5A3030" }}>
          Já tem conta?{" "}
          <Link href="/login" className="underline" style={{ color: "#C4A8A4" }}>
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  );
}
