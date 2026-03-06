"use client";

import { useSession } from "next-auth/react";
import { TIER_LIMITS, hasAccess, type Tier, type TierLimits } from "@/lib/tier-limits";

export function useTier() {
  const { data: session, status } = useSession();

  const tier: Tier = (session?.user?.tier as Tier) ?? "free";
  const limits: TierLimits = TIER_LIMITS[tier];

  return {
    tier,
    limits,
    isFree: tier === "free",
    isPro: tier === "pro" || tier === "enterprise",
    isEnterprise: tier === "enterprise",
    isLoading: status === "loading",
    isLoggedIn: status === "authenticated",
    hasAccess: (requiredTier: Tier) => hasAccess(tier, requiredTier),
  };
}
