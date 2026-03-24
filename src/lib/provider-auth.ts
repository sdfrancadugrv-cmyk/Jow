import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "jow-dev-secret-mude-em-producao-2026";

export interface ProviderPayload {
  sub: string;   // providerId
  email: string;
  name: string;
  status: string;
  iat?: number;
  exp?: number;
}

export function signProviderToken(payload: Omit<ProviderPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyProviderToken(token: string): ProviderPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ProviderPayload;
  } catch {
    return null;
  }
}

export async function getAuthProvider(): Promise<ProviderPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("kadosh_provider_token")?.value;
  if (!token) return null;
  return verifyProviderToken(token);
}

// JWT de uso único para link do WhatsApp (48h) — não precisa de BD
export function signBidLinkToken(providerId: string, requestId: string): string {
  return jwt.sign({ providerId, requestId }, JWT_SECRET, { expiresIn: "48h" });
}

export function verifyBidLinkToken(token: string): { providerId: string; requestId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { providerId: string; requestId: string };
  } catch {
    return null;
  }
}
