import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signProviderToken } from "@/lib/provider-auth";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kadosh-ai.vercel.app";
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${appUrl}/provider/login?error=fb_cancelled`);

  try {
    // Troca código por token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID!,
        client_secret: process.env.FACEBOOK_APP_SECRET!,
        redirect_uri: `${appUrl}/api/provider/facebook/callback`,
        code,
      })
    );
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return NextResponse.redirect(`${appUrl}/provider/login?error=fb_token`);

    // Busca dados do usuário
    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokens.access_token}`
    );
    const fbUser = await userRes.json();
    if (!fbUser.id) return NextResponse.redirect(`${appUrl}/provider/login?error=fb_user`);

    // Busca ou cria ServiceProvider
    let provider = await prisma.serviceProvider.findFirst({
      where: {
        OR: [
          { facebookId: fbUser.id },
          ...(fbUser.email ? [{ email: fbUser.email }] : []),
        ],
      },
    });

    if (!provider) {
      provider = await prisma.serviceProvider.create({
        data: {
          email: fbUser.email || null,
          name: fbUser.name || "Usuário Facebook",
          facebookId: fbUser.id,
          authProvider: "facebook",
        },
      });
    } else if (!provider.facebookId) {
      provider = await prisma.serviceProvider.update({
        where: { id: provider.id },
        data: { facebookId: fbUser.id, authProvider: "facebook" },
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
    console.error("Facebook callback error:", e);
    return NextResponse.redirect(`${appUrl}/provider/login?error=fb_fail`);
  }
}
