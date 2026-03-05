/**
 * Market Matcher — runs every 30 minutes
 *
 * Finds cross-platform matches between Polymarket and Kalshi markets.
 * 
 * Optimized for large market sets (200K+):
 * 1. Pre-filter to active markets with volume/liquidity
 * 2. Extract key entities from titles for bucketing
 * 3. Only compare markets in matching entity buckets
 * 4. Use structured + fuzzy matching from core/matching.ts
 */

import { findMatches } from "../../../core/src/matching";
import type { Market } from "../../../core/src/types";
import { db, schema } from "../../../core/src/db/index";
import { eq, and, or, gt, sql, isNotNull, desc } from "drizzle-orm";

/** Convert a DB market row (with platform) to the core Market type */
function toMarketType(row: any): Market {
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

/** Extract key entity words from a title for bucketing */
function extractBucketKeys(title: string): string[] {
  const normalized = title.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  
  // Return significant words (skip common stop words)
  const stopWords = new Set([
    "will", "the", "and", "for", "this", "that", "with", "from", "have",
    "are", "was", "were", "been", "has", "had", "its", "not", "but",
    "what", "which", "who", "how", "when", "where", "why", "than",
    "more", "most", "after", "before", "between", "under", "over",
    "into", "through", "during", "about", "above", "below",
  ]);

  return words.filter((w) => !stopWords.has(w));
}

export async function handler() {
  console.log("[MarketMatcher] Starting cross-platform matching...");

  // Get already-matched market IDs
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

  // Fetch ACTIVE markets with meaningful volume or liquidity
  // Limit to top markets by volume to keep matching tractable
  const allMarkets = await db.query.markets.findMany({
    where: and(
      eq(schema.markets.status, "active"),
      isNotNull(schema.markets.yesPrice),
      // Only markets with some volume or liquidity
      or(
        gt(schema.markets.volume24h, "0"),
        gt(schema.markets.liquidity, "0"),
      ),
    ),
    with: { platform: { columns: { slug: true, name: true } } },
    orderBy: [desc(schema.markets.volume24h)],
    limit: 10000, // Top 10K by volume — covers anything worth matching
  });

  // Split by platform and filter already-matched
  const polymarketMarkets: Market[] = [];
  const kalshiMarkets: Market[] = [];

  for (const m of allMarkets) {
    if (matchedIds.has(m.id)) continue;

    const converted = toMarketType(m);
    if ((m.platform as any).slug === "polymarket") {
      polymarketMarkets.push(converted);
    } else if ((m.platform as any).slug === "kalshi") {
      kalshiMarkets.push(converted);
    }
  }

  console.log(
    `[MarketMatcher] Candidates: ${polymarketMarkets.length} Polymarket, ${kalshiMarkets.length} Kalshi`
  );

  if (polymarketMarkets.length === 0 || kalshiMarkets.length === 0) {
    console.log("[MarketMatcher] Not enough unmatched markets on both platforms.");
    return { matchCount: 0 };
  }

  // ── Bucket-based matching ────────────────────────────
  // Instead of N×M comparison, bucket by shared keywords and compare within buckets
  const kalshiBuckets = new Map<string, Market[]>();
  for (const m of kalshiMarkets) {
    const keys = extractBucketKeys(m.title);
    for (const key of keys) {
      if (!kalshiBuckets.has(key)) kalshiBuckets.set(key, []);
      kalshiBuckets.get(key)!.push(m);
    }
  }

  const candidatePairs = new Map<string, { pm: Market; kl: Market[] }>();

  for (const pm of polymarketMarkets) {
    const keys = extractBucketKeys(pm.title);
    const kalshiCandidates = new Set<Market>();

    for (const key of keys) {
      const bucket = kalshiBuckets.get(key);
      if (bucket) {
        for (const kl of bucket) {
          kalshiCandidates.add(kl);
        }
      }
    }

    if (kalshiCandidates.size > 0) {
      candidatePairs.set(String(pm.id), { pm, kl: [...kalshiCandidates] });
    }
  }

  console.log(
    `[MarketMatcher] Found ${candidatePairs.size} Polymarket markets with Kalshi candidates`
  );

  // Run the core matching algorithm on each candidate group
  let matchCount = 0;
  const usedKalshi = new Set<number>();

  for (const { pm, kl } of candidatePairs.values()) {
    const availableKl = kl.filter((k) => !usedKalshi.has(k.id));
    if (availableKl.length === 0) continue;

    const matches = findMatches([pm], availableKl, 0.55);

    for (const match of matches) {
      if (usedKalshi.has(match.marketB.id)) continue;

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
      usedKalshi.add(match.marketB.id);
      matchCount++;
    }
  }

  console.log(`[MarketMatcher] Found ${matchCount} new matches.`);
  return { matchCount };
}
