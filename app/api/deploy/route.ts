import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { html, projectName } = await req.json();

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "VERCEL_TOKEN não configurado" }, { status: 500 });
  }

  const name = projectName
    ? projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50)
    : `joe-site-${Date.now()}`;

  const response = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      files: [
        {
          file: "index.html",
          data: html,
        },
      ],
      projectSettings: {
        framework: null,
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: data.error?.message || "Erro no deploy" }, { status: 500 });
  }

  return NextResponse.json({
    url: `https://${data.url}`,
    name: data.name,
  });
}
