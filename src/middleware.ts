import { NextRequest, NextResponse } from "next/server";

function parseToken(token: string): { valid: boolean; isAdmin: boolean } {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, isAdmin: false };
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 <= Date.now()) return { valid: false, isAdmin: false };
    return { valid: true, isAdmin: !!payload.isAdmin };
  } catch {
    return { valid: false, isAdmin: false };
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("jow_token")?.value;
  const { valid: tokenValido, isAdmin } = token ? parseToken(token) : { valid: false, isAdmin: false };

  // Protege /app e /admin — redireciona para login se não autenticado
  if (pathname.startsWith("/app") || pathname.startsWith("/admin")) {
    if (!tokenValido) {
      const res = NextResponse.redirect(new URL("/login", req.url));
      if (token) res.cookies.delete("jow_token"); // limpa cookie inválido
      return res;
    }
  }

  // Se já está logado e tenta acessar /login ou /register → redireciona conforme perfil
  if ((pathname === "/login" || pathname === "/register") && tokenValido) {
    return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*", "/admin", "/login", "/register"],
};
