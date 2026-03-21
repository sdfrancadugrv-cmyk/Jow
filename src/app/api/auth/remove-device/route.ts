import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { deviceId } = await req.json();

  await prisma.device.deleteMany({
    where: { id: deviceId, clientId: user.sub },
  });

  return NextResponse.json({ ok: true });
}
