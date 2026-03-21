import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("jow_token", "", { maxAge: 0, path: "/" });
  res.cookies.set("jow_device", "", { maxAge: 0, path: "/" });
  return res;
}
