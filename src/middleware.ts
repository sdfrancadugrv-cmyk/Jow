import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("jow_token")?.value;

  // Protege /app — redireciona para login se não autenticado
  if (pathname.startsWith("/app")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // Se já está logado e tenta acessar /login ou /register → manda pro app
  if ((pathname === "/login" || pathname === "/register") && token) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login", "/register"],
};
