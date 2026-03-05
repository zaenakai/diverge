/**
 * Price Collector — runs every minute
 *
 * Snapshots current prices for all active markets into price_snapshots.
 */

import { db, schema } from "../../../core/src/db/index";
import { eq } from "drizzle-orm";

export async function handler() {
  console.log("[PriceCollector] Starting price snapshot...");

  // Fetch all active markets with their current prices
  const activeMarkets = await db
    .select({
      id: schema.markets.id,
      yesPrice: schema.markets.yesPrice,
      noPrice: schema.markets.noPrice,
      volume24h: schema.markets.volume24h,
      liquidity: schema.markets.liquidity,
    })
    .from(schema.markets)
    .where(eq(schema.markets.status, "active"));

  if (activeMarkets.length === 0) {
    console.log("[PriceCollector] No active markets found.");
    return { snapshotCount: 0 };
  }

  // Filter and build snapshot rows
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

  // Batch insert price snapshots
  await db.insert(schema.priceSnapshots).values(snapshots);

  console.log(`[PriceCollector] Done. Snapshotted ${snapshots.length} markets.`);
  return { snapshotCount: snapshots.length };
}
