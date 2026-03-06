/**
 * Shared formatting utilities and types for the Diverge frontend.
 * Extracted from mock-data.ts — these are pure helpers with no data dependencies.
 */

/**
 * Convert Prisma Decimal objects (or any value) to a plain number.
 * The API returns decimals as { s: 1, e: -1, d: [9995000] } — this handles that.
 *
 * Decimal.js stores: { s: sign, e: exponent (of MSD), d: digit groups (base 1e7) }
 * d[0] may have fewer than 7 digits; subsequent groups are always 7 digits.
 */
export function toNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (val.d && Array.isArray(val.d)) {
    const s = val.s ?? 1;
    const e = val.e ?? 0;
    const d: number[] = val.d;
    // Build the coefficient integer by treating d as base-1e7 digits
    let n = 0;
    for (let i = 0; i < d.length; i++) {
      n = n * 1e7 + d[i];
    }
    // d[0] may have 1-7 digits; the rest are always 7
    const len0 = d[0] > 0 ? Math.floor(Math.log10(d[0])) + 1 : 1;
    const totalDigits = len0 + (d.length - 1) * 7;
    return s * n * Math.pow(10, e + 1 - totalDigits);
  }
  return Number(val) || 0;
}

export function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const categoryColors: Record<string, string> = {
  Crypto: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  crypto: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  Politics: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  politics: "border-blue-400/30 bg-blue-400/10 text-blue-400",
  Sports: "border-orange-400/30 bg-orange-400/10 text-orange-400",
  sports: "border-orange-400/30 bg-orange-400/10 text-orange-400",
  Science: "border-purple-400/30 bg-purple-400/10 text-purple-400",
  science: "border-purple-400/30 bg-purple-400/10 text-purple-400",
  Entertainment: "border-pink-400/30 bg-pink-400/10 text-pink-400",
  entertainment: "border-pink-400/30 bg-pink-400/10 text-pink-400",
  Economics: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  economics: "border-yellow-400/30 bg-yellow-400/10 text-yellow-400",
  Other: "border-white/20 bg-white/5 text-white/50",
  other: "border-white/20 bg-white/5 text-white/50",
};

export type Platform = "polymarket" | "kalshi";

export type Category =
  | "All"
  | "Crypto"
  | "Politics"
  | "Sports"
  | "Science"
  | "Entertainment"
  | "Economics";

/** Shape used by the ArbCard component */
export interface ArbOpportunity {
  id: string;
  title: string;
  category: string;
  buyPlatform: Platform;
  sellPlatform: Platform;
  buyPrice: number;
  sellPrice: number;
  rawSpread: number;
  adjustedSpread: number;
  volume: number;
  trend: "widening" | "narrowing" | "stable";
  timeOpen: string;
  buyUrl?: string | null;
  sellUrl?: string | null;
}

/** Shape used by the Markets Explorer page */
export interface ExplorerMarket {
  id: string;
  title: string;
  category: string;
  matched: boolean;
  platform?: Platform;
  yesPrice?: number;
  change24h: number;
  volume24h: number;
  totalVolume: number;
  endDate: string;
  // Matched-market fields
  polymarketPrice?: number;
  kalshiPrice?: number;
  spread?: number;
  polyVolume24h?: number;
  kalshiVolume24h?: number;
}

/** Shape used by the Compare page */
export interface MatchedMarket {
  id: string;
  title: string;
  category: string;
  polymarketYes: number;
  kalshiYes: number;
  spread: number;
  matchConfidence: number;
  polyVolume24h: number;
  kalshiVolume24h: number;
  priceHistory: { date: string; poly: number; kalshi: number }[];
  spreadHistory: { date: string; spread: number }[];
}

/** Shape used by the Accuracy page */
export interface AccuracyData {
  category: string;
  polyBrier: number;
  kalshiBrier: number;
  sampleSize: number;
}
