import Stripe from "stripe";

function createStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, {
    apiVersion: "2025-12-18.acacia" as Stripe.LatestApiVersion,
    typescript: true,
  });
}

export const stripe = createStripe();

export const PLANS = {
  pro: {
    name: "Pro",
    price: 2500, // cents
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    tier: "pro" as const,
  },
  enterprise: {
    name: "Enterprise",
    price: 9900,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    tier: "enterprise" as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
