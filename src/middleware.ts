import { NextRequest, NextResponse } from "next/server";

function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("jow_token")?.value;
  const tokenValido = token ? isTokenValid(token) : false;

  // Protege /app — redireciona para login se não autenticado
  if (pathname.startsWith("/app")) {
    if (!tokenValido) {
      const res = NextResponse.redirect(new URL("/login", req.url));
      if (token) res.cookies.delete("jow_token"); // limpa cookie inválido
      return res;
    }
  }

  // Se já está logado e tenta acessar /login ou /register → manda pro app
  if ((pathname === "/login" || pathname === "/register") && tokenValido) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
