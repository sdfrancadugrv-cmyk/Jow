export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { distanceKm } from "@/lib/whatsapp-send";
import { ALL_SERVICES } from "@/lib/service-types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = (searchParams.get("s") || "").toLowerCase().trim();
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  // Encontra valores de serviceType que batem com a query
  const matchedValues = query
    ? ALL_SERVICES
        .filter(s =>
          s.label.toLowerCase().includes(query) ||
          s.value.toLowerCase().includes(query)
        )
        .map(s => s.value)
    : [];

  // Busca prestadores ativos
  const providers = await prisma.serviceProvider.findMany({
    where: {
      status: "active",
      lat: { not: null },
      lng: { not: null },
      ...(matchedValues.length > 0
        ? { OR: matchedValues.map(v => ({ serviceType: { contains: v } })) }
        : {}),
    },
    select: {
      id: true,
      name: true,
      serviceType: true,
      city: true,
      lat: true,
      lng: true,
      rating: true,
      reviewCount: true,
      dailyRate: true,
    },
    take: 50,
  });

  // Calcula distância e ordena
  const withDistance = providers
    .map(p => ({
      ...p,
      distance: lat && lng && p.lat && p.lng
        ? Math.round(distanceKm(lat, lng, p.lat, p.lng) * 10) / 10
        : null,
    }))
    .sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    })
    .slice(0, 20);

  return NextResponse.json({ providers: withDistance });
}
