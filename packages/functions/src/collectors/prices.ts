/**
 * Price Collector — runs every minute
 *
 * Snapshots current prices for all matched/active markets.
 * This is the high-frequency table — partitioned by month.
 */

export async function handler() {
  console.log("[PriceCollector] Starting price snapshot...");

  // TODO: Query all active markets from DB
  // For each market, fetch current price from platform API
  // Insert price_snapshot row

  // For matched markets, we need both prices fresh
  // to calculate real-time spreads

  console.log("[PriceCollector] Done.");
  return { status: "ok" };
}
