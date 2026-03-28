import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://JENNIFER-ai.vercel.app";

  if (!appId) return NextResponse.json({ error: "Facebook OAuth não configurado" }, { status: 500 });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${appUrl}/api/provider/facebook/callback`,
    scope: "email,public_profile",
    response_type: "code",
  });

  return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
