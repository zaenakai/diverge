/**
 * Price Collector — runs every minute
 *
 * Snapshots current prices for all active markets into price_snapshots.
 * Focuses on matched markets first, then all active markets.
 */

import prisma from "../db.js";

export async function handler() {
  console.log("[PriceCollector] Starting price snapshot...");

  // Fetch all active markets with their current prices
  const activeMarkets = await prisma.market.findMany({
    where: { status: "active" },
    select: {
      id: true,
      yesPrice: true,
      noPrice: true,
      volume24h: true,
      liquidity: true,
    },
  });

  if (activeMarkets.length === 0) {
    console.log("[PriceCollector] No active markets found.");
    return { snapshotCount: 0 };
  }

  // Batch insert price snapshots
  const snapshots = activeMarkets
    .filter((m) => m.yesPrice !== null || m.noPrice !== null)
    .map((m) => ({
      marketId: m.id,
      yesPrice: m.yesPrice,
      noPrice: m.noPrice,
      volume24h: m.volume24h,
      liquidity: m.liquidity,
    }));

  const result = await prisma.priceSnapshot.createMany({
    data: snapshots,
  });

  console.log(`[PriceCollector] Done. Snapshotted ${result.count} markets.`);
  return { snapshotCount: result.count };
}
