import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

export const PLANS = {
  pro: {
    name: "Pro",
    price: 2500, // cents
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    tier: "pro" as const,
  },
  enterprise: {
    name: "Enterprise",
    price: 9900,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    tier: "enterprise" as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
