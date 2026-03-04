/**
 * Market Matcher — runs every 30 minutes
 *
 * Finds cross-platform matches between Polymarket and Kalshi markets.
 * Uses structured + fuzzy matching from core/matching.ts.
 */

import { findMatches } from "../../../core/src/matching.js";
import type { Market } from "../../../core/src/types.js";
import { db, schema } from "../../../core/src/db/index.js";
import { eq, notInArray, and } from "drizzle-orm";

/** Convert a DB market row (with platform) to the core Market type */
function toMarketType(row: {
  id: number;
  externalId: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  resolutionDate: Date | null;
  resolvedAt: Date | null;
  outcome: string | null;
  url: string | null;
  yesPrice: string | null;
  noPrice: string | null;
  volume24h: string | null;
  liquidity: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  platform: { slug: string };
}): Market {
  return {
    id: row.id,
    platform: row.platform.slug as Market["platform"],
    externalId: row.externalId,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    status: row.status as Market["status"],
    resolutionDate: row.resolutionDate ?? undefined,
    resolvedAt: row.resolvedAt ?? undefined,
    outcome: (row.outcome as Market["outcome"]) ?? undefined,
    url: row.url ?? undefined,
    yesPrice: row.yesPrice ? Number(row.yesPrice) : undefined,
    noPrice: row.noPrice ? Number(row.noPrice) : undefined,
    volume24h: row.volume24h ? Number(row.volume24h) : undefined,
    liquidity: row.liquidity ? Number(row.liquidity) : undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function handler() {
  console.log("[MarketMatcher] Starting cross-platform matching...");

  // Fetch all existing match IDs to exclude already-matched markets
  const existingMatches = await db
    .select({
      marketAId: schema.marketMatches.marketAId,
      marketBId: schema.marketMatches.marketBId,
    })
    .from(schema.marketMatches);

  const matchedIds = new Set<number>();
  for (const m of existingMatches) {
    matchedIds.add(m.marketAId);
    matchedIds.add(m.marketBId);
  }

  // Build where conditions
  const conditions = [eq(schema.markets.status, "active")];
  if (matchedIds.size > 0) {
    conditions.push(notInArray(schema.markets.id, [...matchedIds]));
  }

  const allActiveMarkets = await db.query.markets.findMany({
    where: and(...conditions),
    with: { platform: true },
  });

  const polymarketMarkets: Market[] = [];
  const kalshiMarkets: Market[] = [];

  for (const m of allActiveMarkets) {
    const converted = toMarketType(m as any);
    if (m.platform.slug === "polymarket") {
      polymarketMarkets.push(converted);
    } else if (m.platform.slug === "kalshi") {
      kalshiMarkets.push(converted);
    }
  }

  if (polymarketMarkets.length === 0 || kalshiMarkets.length === 0) {
    console.log("[MarketMatcher] Not enough unmatched markets on both platforms.");
    return { matchCount: 0 };
  }

  const matches = findMatches(polymarketMarkets, kalshiMarkets, 0.6);

  let matchCount = 0;
  for (const match of matches) {
    await db
      .insert(schema.marketMatches)
      .values({
        marketAId: match.marketA.id,
        marketBId: match.marketB.id,
        confidence: match.confidence,
        matchMethod: match.method,
        verified: false,
      })
      .onConflictDoUpdate({
        target: [schema.marketMatches.marketAId, schema.marketMatches.marketBId],
        set: {
          confidence: match.confidence,
          matchMethod: match.method,
        },
      });
    matchCount++;
  }

  console.log(`[MarketMatcher] Found ${matchCount} new matches.`);
  return { matchCount };
}
