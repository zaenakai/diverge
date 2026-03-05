/**
 * Price Collector — runs every minute
 *
 * Snapshots current prices for matched markets only (ones shown on compare page).
 * Batches inserts to stay under PostgreSQL's 65535 parameter limit.
 */

import { db, schema } from "../../../core/src/db/index";
import { eq, or, inArray } from "drizzle-orm";

const BATCH_SIZE = 5000; // 5 columns per row → 25K params per batch (well under 65535)

export async function handler() {
  console.log("[PriceCollector] Starting price snapshot...");

  // Get all market IDs from matches (only snapshot markets we actually compare)
  const matches = await db
    .select({
      marketAId: schema.marketMatches.marketAId,
      marketBId: schema.marketMatches.marketBId,
    })
    .from(schema.marketMatches);

  const matchedIds = new Set<number>();
  for (const m of matches) {
    matchedIds.add(m.marketAId);
    matchedIds.add(m.marketBId);
  }

  if (matchedIds.size === 0) {
    console.log("[PriceCollector] No matched markets to snapshot.");
    return { snapshotCount: 0 };
  }

  // Fetch current prices for matched markets
  const idArray = Array.from(matchedIds);
  const activeMarkets = await db
    .select({
      id: schema.markets.id,
      yesPrice: schema.markets.yesPrice,
      noPrice: schema.markets.noPrice,
      volume24h: schema.markets.volume24h,
      liquidity: schema.markets.liquidity,
    })
    .from(schema.markets)
    .where(inArray(schema.markets.id, idArray));

  // Filter to markets with actual prices
  const snapshots = activeMarkets
    .filter((m) => m.yesPrice !== null || m.noPrice !== null)
    .map((m) => ({
      marketId: m.id,
      yesPrice: m.yesPrice,
      noPrice: m.noPrice,
      volume24h: m.volume24h,
      liquidity: m.liquidity,
    }));

  if (snapshots.length === 0) {
    console.log("[PriceCollector] No markets with prices to snapshot.");
    return { snapshotCount: 0 };
  }

  // Batch insert to stay under PostgreSQL parameter limits
  let inserted = 0;
  for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
    const batch = snapshots.slice(i, i + BATCH_SIZE);
    await db.insert(schema.priceSnapshots).values(batch);
    inserted += batch.length;
  }

  console.log(`[PriceCollector] Done. Snapshotted ${inserted} matched markets (${matchedIds.size} unique IDs).`);
  return { snapshotCount: inserted };
}
