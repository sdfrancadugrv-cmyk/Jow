import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vox — Criador de sites por voz",
  description: "Descreva seu site por voz e receba um site profissional em segundos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
