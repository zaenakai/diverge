import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.userId && session.metadata?.plan) {
          const tier = session.metadata.plan === "enterprise" ? "enterprise" : "pro";
          await prisma.user.update({
            where: { id: session.metadata.userId },
            data: {
              tier,
              stripeCustomerId: session.customer as string,
            },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!user) return;

  // Determine tier from the price
  const priceId = subscription.items.data[0]?.price?.id;
  let tier = "free";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = "pro";
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    tier = "enterprise";
  }

  // Only update if subscription is active
  if (subscription.status === "active" || subscription.status === "trialing") {
    await prisma.user.update({
      where: { id: user.id },
      data: { tier },
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: { tier: "free" },
  });
}
