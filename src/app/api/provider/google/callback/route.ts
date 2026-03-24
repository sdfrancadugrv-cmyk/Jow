import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signProviderToken } from "@/lib/provider-auth";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jow-mu.vercel.app";
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${appUrl}/provider/login?error=google_cancelled`);

  try {
    // Troca código por token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${appUrl}/api/provider/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return NextResponse.redirect(`${appUrl}/provider/login?error=google_token`);

    // Busca dados do usuário
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const gUser = await userRes.json();
    if (!gUser.email) return NextResponse.redirect(`${appUrl}/provider/login?error=google_email`);

    // Busca ou cria ServiceProvider
    let provider = await prisma.serviceProvider.findFirst({
      where: { OR: [{ googleId: gUser.id }, { email: gUser.email }] },
    });

    if (!provider) {
      provider = await prisma.serviceProvider.create({
        data: {
          email: gUser.email,
          name: gUser.name || gUser.email.split("@")[0],
          googleId: gUser.id,
          authProvider: "google",
        },
      });
    } else if (!provider.googleId) {
      provider = await prisma.serviceProvider.update({
        where: { id: provider.id },
        data: { googleId: gUser.id, authProvider: "google" },
      });
    }

    const token = signProviderToken({
      sub: provider.id,
      email: provider.email || "",
      name: provider.name,
      status: provider.status,
    });

    const needsProfile = !provider.phone || !provider.serviceType;
    const dest = needsProfile ? "/provider/complete-profile" : "/provider/dashboard";

    const response = NextResponse.redirect(`${appUrl}${dest}`);
    response.cookies.set("kadosh_provider_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (e) {
    console.error("Google callback error:", e);
    return NextResponse.redirect(`${appUrl}/provider/login?error=google_fail`);
  }
}
