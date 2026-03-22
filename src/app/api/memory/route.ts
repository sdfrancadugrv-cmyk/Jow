export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { loadMemoryContext } from "@/core/memory/MemoryManager";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ summaries: [], recentHistory: [] });

    const context = await loadMemoryContext(user.sub);
    return NextResponse.json(context);
  } catch (err) {
    console.error("[Memory API]", err);
    return NextResponse.json({ summaries: [], recentHistory: [] });
  }
}
