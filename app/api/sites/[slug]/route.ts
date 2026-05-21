import { NextRequest, NextResponse } from "next/server";
import { getSite, updateSite } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite(slug);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(site);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  const site = await updateSite(slug, body);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(site);
}
