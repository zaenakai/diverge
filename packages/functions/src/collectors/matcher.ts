/**
 * Market Matcher — runs every 30 minutes
 *
 * Finds cross-platform matches between Polymarket and Kalshi markets.
 * Uses structured + fuzzy matching from core/matching.ts.
 */

import { findMatches } from "../../../core/src/matching.js";
import type { Market } from "../../../core/src/types.js";
import prisma from "../db.js";

/** Convert a Prisma market row (with included platform) to the core Market type */
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
  yesPrice: unknown;
  noPrice: unknown;
  volume24h: unknown;
  liquidity: unknown;
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

  // Fetch all active markets that aren't already matched
  const existingMatchIds = await prisma.marketMatch.findMany({
    select: { marketAId: true, marketBId: true },
  });
  const matchedIds = new Set<number>();
  for (const m of existingMatchIds) {
    matchedIds.add(m.marketAId);
    matchedIds.add(m.marketBId);
  }

  const allActiveMarkets = await prisma.market.findMany({
    where: {
      status: "active",
      id: matchedIds.size > 0 ? { notIn: [...matchedIds] } : undefined,
    },
    include: { platform: true },
  });

  const polymarketMarkets: Market[] = [];
  const kalshiMarkets: Market[] = [];

  for (const m of allActiveMarkets) {
    const converted = toMarketType(m);
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
    await prisma.marketMatch.upsert({
      where: {
        marketAId_marketBId: {
          marketAId: match.marketA.id,
          marketBId: match.marketB.id,
        },
      },
      create: {
        marketAId: match.marketA.id,
        marketBId: match.marketB.id,
        confidence: match.confidence,
        matchMethod: match.method,
        verified: false,
      },
      update: {
        confidence: match.confidence,
        matchMethod: match.method,
      },
    });
    matchCount++;
  }

  console.log(`[MarketMatcher] Found ${matchCount} new matches.`);
  return { matchCount };
}
