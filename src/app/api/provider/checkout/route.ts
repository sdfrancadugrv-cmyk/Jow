import { NextResponse } from "next/server";
import { Preference } from "mercadopago";
import { mp } from "@/lib/mercadopago";
import { getAuthProvider } from "@/lib/provider-auth";
import prisma from "@/lib/prisma";
import { getProviderPrice } from "@/lib/service-types";

const APP_URL = "https://kadosh-ai.vercel.app";

export async function POST() {
  const auth = await getAuthProvider();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const provider = await prisma.serviceProvider.findUnique({ where: { id: auth.sub } });
  if (!provider) return NextResponse.json({ error: "Prestador não encontrado" }, { status: 404 });

  if (provider.status === "active" && provider.expiresAt && provider.expiresAt > new Date()) {
    return NextResponse.json({ url: `${APP_URL}/provider/dashboard` });
  }

  const priceAmount = getProviderPrice(provider.serviceType || "");

  const preference = new Preference(mp);
  const response = await preference.create({
    body: {
      items: [{
        id: "provider-plan",
        title: "Kadosh Prestador — 30 dias",
        quantity: 1,
        unit_price: priceAmount / 100,
        currency_id: "BRL",
      }],
      external_reference: `provider|${provider.id}`,
      notification_url: `${APP_URL}/api/mercadopago/webhook`,
      back_urls: {
        success: `${APP_URL}/provider/dashboard?payment=success`,
        failure: `${APP_URL}/provider/subscribe`,
        pending: `${APP_URL}/provider/dashboard?payment=pending`,
      },
    },
  });

  return NextResponse.json({
    preferenceId: response.id,
    priceAmount,
  });
}
