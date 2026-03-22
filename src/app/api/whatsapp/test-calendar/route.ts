export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/googleCalendar";

export async function GET() {
  try {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    // Pula fim de semana
    while (today.getDay() === 0 || today.getDay() === 6) today.setDate(today.getDate() + 1);
    const date = today.toISOString().split("T")[0];

    const av = await checkAvailability(date);
    return NextResponse.json({ ok: true, date, availability: av });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
