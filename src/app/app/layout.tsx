import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("jow_token")?.value;

  if (!token) redirect("/login");

  const payload = verifyToken(token);
  if (!payload) redirect("/login");

  // Verifica se assinatura ainda está ativa no banco
  const client = await prisma.client.findUnique({
    where: { id: payload.sub },
    select: { status: true },
  });

  if (!client || client.status !== "active") {
    redirect("/login?expired=true");
  }

  return <>{children}</>;
}
