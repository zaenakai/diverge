/**
 * Market Collector — runs every 5 minutes
 *
 * Fetches all active markets from Polymarket + Kalshi,
 * upserts into PostgreSQL.
 */

import * as polymarket from "@diverge/core/platforms/polymarket.js";
import * as kalshi from "@diverge/core/platforms/kalshi.js";
import prisma from "../db.js";

/** Ensure platform rows exist and return their IDs */
async function ensurePlatforms(): Promise<{ polymarketId: number; kalshiId: number }> {
  const [pm, kl] = await Promise.all([
    prisma.platform.upsert({
      where: { slug: "polymarket" },
      create: { slug: "polymarket", name: "Polymarket", apiBase: "https://gamma-api.polymarket.com" },
      update: {},
    }),
    prisma.platform.upsert({
      where: { slug: "kalshi" },
      create: { slug: "kalshi", name: "Kalshi", apiBase: "https://api.elections.kalshi.com/trade-api/v2" },
      update: {},
    }),
  ]);
  return { polymarketId: pm.id, kalshiId: kl.id };
}

async function collectPolymarket(platformId: number): Promise<number> {
  let count = 0;
  let offset = 0;
  const limit = 100;

  while (true) {
    const markets = await polymarket.fetchMarkets({ limit, offset, active: true });
    if (markets.length === 0) break;

    for (const market of markets) {
      const prices = polymarket.parsePrices(market);

      await prisma.market.upsert({
        where: {
          platformId_externalId: { platformId, externalId: market.id },
        },
        create: {
          platformId,
          externalId: market.id,
          title: market.question,
          status: market.closed ? "closed" : "active",
          yesPrice: prices.yes,
          noPrice: prices.no,
          volume24h: parseFloat(market.volume24hr) || 0,
          liquidity: parseFloat(market.liquidity) || 0,
          resolutionDate: market.endDate ? new Date(market.endDate) : null,
          url: `https://polymarket.com/event/${market.slug}`,
          metadata: {
            conditionId: market.conditionId,
            clobTokenIds: market.clobTokenIds,
            acceptingOrders: market.acceptingOrders,
          },
        },
        update: {
          title: market.question,
          status: market.closed ? "closed" : "active",
          yesPrice: prices.yes,
          noPrice: prices.no,
          volume24h: parseFloat(market.volume24hr) || 0,
          liquidity: parseFloat(market.liquidity) || 0,
          resolutionDate: market.endDate ? new Date(market.endDate) : null,
        },
      });
      count++;
    }

    offset += limit;
    if (markets.length < limit) break;
  }

  return count;
}

async function collectKalshi(platformId: number): Promise<number> {
  let count = 0;
  let cursor: string | undefined;

  while (true) {
    const result = await kalshi.fetchMarkets({
      limit: 100,
      cursor: cursor,
      status: "open",
    });

    for (const market of result.markets) {
      const prices = kalshi.getMidPrice(market);

      await prisma.market.upsert({
        where: {
          platformId_externalId: { platformId, externalId: market.ticker },
        },
        create: {
          platformId,
          externalId: market.ticker,
          title: market.title,
          category: market.category,
          status: market.status === "active" ? "active" : "closed",
          yesPrice: prices.yes,
          noPrice: prices.no,
          volume24h: market.volume_24h,
          liquidity: market.liquidity,
          resolutionDate: new Date(market.expiration_time),
          url: `https://kalshi.com/markets/${market.ticker}`,
          metadata: {
            eventTicker: market.event_ticker,
            subtitle: market.subtitle,
            openInterest: market.open_interest,
          },
        },
        update: {
          title: market.title,
          category: market.category,
          status: market.status === "active" ? "active" : "closed",
          yesPrice: prices.yes,
          noPrice: prices.no,
          volume24h: market.volume_24h,
          liquidity: market.liquidity,
          resolutionDate: new Date(market.expiration_time),
        },
      });
      count++;
    }

    cursor = result.cursor;
    if (!cursor || result.markets.length === 0) break;
  }

  return count;
}

export async function handler() {
  console.log("[MarketCollector] Starting collection...");

  const { polymarketId, kalshiId } = await ensurePlatforms();

  const [polymarketCount, kalshiCount] = await Promise.all([
    collectPolymarket(polymarketId),
    collectKalshi(kalshiId),
  ]);

  console.log(`[MarketCollector] Done. Polymarket: ${polymarketCount}, Kalshi: ${kalshiCount}`);
  return { polymarketCount, kalshiCount };
}
