import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jow-mu.vercel.app";

  if (!clientId) return NextResponse.json({ error: "Google OAuth não configurado" }, { status: 500 });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl}/api/provider/google/callback`,
    response_type: "code",
    scope: "email profile",
    access_type: "online",
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
