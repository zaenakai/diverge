import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db, schema, eq } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
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
          await db
            .update(schema.users)
            .set({
              tier,
              stripeCustomerId: session.customer as string,
            })
            .where(eq(schema.users.id, session.metadata.userId));
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
  const userRows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.stripeCustomerId, customerId))
    .limit(1);

  const user = userRows[0];
  if (!user) return;

  const priceId = subscription.items.data[0]?.price?.id;
  let tier = "free";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = "pro";
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    tier = "enterprise";
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    await db
      .update(schema.users)
      .set({ tier })
      .where(eq(schema.users.id, user.id));
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  await db
    .update(schema.users)
    .set({ tier: "free" })
    .where(eq(schema.users.stripeCustomerId, customerId));
}
