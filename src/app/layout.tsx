import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JOW — AI Orchestrator",
  description: "Seu assistente pessoal de IA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0A0A0F] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
