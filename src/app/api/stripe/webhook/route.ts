export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Pagamento inicial confirmado — ativa o usuário
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = session.metadata?.clientId;
        const providerId = session.metadata?.providerId;
        if (clientId) {
          await prisma.client.update({
            where: { id: clientId },
            data: {
              status: "active",
              subscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
            },
          });
        }
        if (providerId) {
          await prisma.serviceProvider.update({
            where: { id: providerId },
            data: {
              status: "active",
              subscriptionId: session.subscription as string,
              stripeCustomerId: session.customer as string,
            },
          });
        }
        break;
      }

      // Renovação mensal bem-sucedida — mantém ativo
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await prisma.client.updateMany({
            where: { stripeCustomerId: invoice.customer as string },
            data: { status: "active" },
          });
        }
        break;
      }

      // Falha no pagamento — bloqueia acesso
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await prisma.client.updateMany({
            where: { stripeCustomerId: invoice.customer as string },
            data: { status: "inactive" },
          });
        }
        break;
      }

      // Assinatura cancelada — bloqueia acesso
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.customer) {
          await prisma.client.updateMany({
            where: { stripeCustomerId: sub.customer as string },
            data: { status: "inactive" },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[Webhook] Erro ao processar evento:", err);
  }

  return NextResponse.json({ received: true });
}
