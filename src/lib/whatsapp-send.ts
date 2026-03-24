import prisma from "@/lib/prisma";

const ZAPI_BASE = "https://api.z-api.io/instances";

export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    const agent = await prisma.whatsappAgent.findFirst({ where: { active: true } });
    if (!agent) return false;

    const url = `${ZAPI_BASE}/${agent.instanceId}/token/${agent.token}/send-text`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": process.env.ZAPI_CLIENT_TOKEN || "",
      },
      body: JSON.stringify({ phone, message }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

// Distância entre dois pontos GPS em km (Haversine)
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
