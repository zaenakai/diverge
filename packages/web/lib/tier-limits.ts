export type Tier = "free" | "pro" | "enterprise";

export const TIER_LIMITS = {
  free: {
    marketsPerPage: 20,
    matchesVisible: 10,
    arbsVisible: 3,
    priceHistoryDays: 1,
    compareDetail: false,
    exportData: false,
    apiAccess: false,
    whaleAlerts: false,
    refreshInterval: 300000,
  },
  pro: {
    marketsPerPage: 100,
    matchesVisible: Infinity,
    arbsVisible: Infinity,
    priceHistoryDays: 90,
    compareDetail: true,
    exportData: true,
    apiAccess: false,
    whaleAlerts: false,
    refreshInterval: 60000,
  },
  enterprise: {
    marketsPerPage: Infinity,
    matchesVisible: Infinity,
    arbsVisible: Infinity,
    priceHistoryDays: 365,
    compareDetail: true,
    exportData: true,
    apiAccess: true,
    whaleAlerts: true,
    refreshInterval: 10000,
  },
} as const;

export type TierLimits = (typeof TIER_LIMITS)[Tier];

const TIER_HIERARCHY: Record<Tier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export function hasAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}
