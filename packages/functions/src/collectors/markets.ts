/**
 * Market Collector — runs every 5 minutes
 *
 * Fetches all active markets from Polymarket + Kalshi,
 * upserts into PostgreSQL.
 */

import * as polymarket from "@prediction-market/core/platforms/polymarket.js";
import * as kalshi from "@prediction-market/core/platforms/kalshi.js";

export async function handler() {
  console.log("[MarketCollector] Starting collection...");

  // ── Polymarket ───────────────────────────────────
  let polymarketCount = 0;
  let offset = 0;
  const limit = 100;

  while (true) {
    const markets = await polymarket.fetchMarkets({ limit, offset, active: true });
    if (markets.length === 0) break;

    for (const market of markets) {
      const prices = polymarket.parsePrices(market);
      // TODO: upsert to PostgreSQL
      // await db.upsertMarket({
      //   platform: "polymarket",
      //   externalId: market.id,
      //   title: market.question,
      //   status: market.closed ? "closed" : "active",
      //   yesPrice: prices.yes,
      //   noPrice: prices.no,
      //   volume24h: parseFloat(market.volume24hr) || 0,
      //   liquidity: parseFloat(market.liquidity) || 0,
      //   resolutionDate: market.endDate ? new Date(market.endDate) : undefined,
      //   url: `https://polymarket.com/event/${market.slug}`,
      // });
      polymarketCount++;
    }

    offset += limit;
    if (markets.length < limit) break;
  }

  // ── Kalshi ───────────────────────────────────────
  let kalshiCount = 0;
  let cursor: string | undefined;

  while (true) {
    const result = await kalshi.fetchMarkets({
      limit: 100,
      cursor,
      status: "open",
    });

    for (const market of result.markets) {
      const prices = kalshi.getMidPrice(market);
      // TODO: upsert to PostgreSQL
      // await db.upsertMarket({
      //   platform: "kalshi",
      //   externalId: market.ticker,
      //   title: market.title,
      //   category: market.category,
      //   status: market.status === "active" ? "active" : "closed",
      //   yesPrice: prices.yes,
      //   noPrice: prices.no,
      //   volume24h: market.volume_24h,
      //   liquidity: market.liquidity,
      //   resolutionDate: new Date(market.expiration_time),
      //   url: `https://kalshi.com/markets/${market.ticker}`,
      // });
      kalshiCount++;
    }

    cursor = result.cursor;
    if (!cursor || result.markets.length === 0) break;
  }

  console.log(`[MarketCollector] Done. Polymarket: ${polymarketCount}, Kalshi: ${kalshiCount}`);

  return { polymarketCount, kalshiCount };
}
