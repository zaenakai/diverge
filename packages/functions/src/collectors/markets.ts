/**
 * Market Collector — runs every 5 minutes
 *
 * Fetches all active markets from Polymarket + Kalshi,
 * upserts into PostgreSQL.
 */

import * as polymarket from "../../../core/src/platforms/polymarket.js";
import * as kalshi from "../../../core/src/platforms/kalshi.js";
import { db, schema } from "../../../core/src/db/index.js";
import { eq } from "drizzle-orm";

/** Ensure platform rows exist and return their IDs */
async function ensurePlatforms(): Promise<{ polymarketId: number; kalshiId: number }> {
  const [pm, kl] = await Promise.all([
    db
      .insert(schema.platforms)
      .values({ slug: "polymarket", name: "Polymarket", apiBase: "https://gamma-api.polymarket.com" })
      .onConflictDoUpdate({
        target: schema.platforms.slug,
        set: { name: "Polymarket" },
      })
      .returning({ id: schema.platforms.id }),
    db
      .insert(schema.platforms)
      .values({ slug: "kalshi", name: "Kalshi", apiBase: "https://api.elections.kalshi.com/trade-api/v2" })
      .onConflictDoUpdate({
        target: schema.platforms.slug,
        set: { name: "Kalshi" },
      })
      .returning({ id: schema.platforms.id }),
  ]);
  return { polymarketId: pm[0].id, kalshiId: kl[0].id };
}

async function collectPolymarket(platformId: number): Promise<number> {
  let count = 0;
  let offset = 0;
  const limit = 100;
  const maxPages = 50;

  while (true) {
    console.log(`[Polymarket] Fetching offset=${offset}...`);
    const markets = await polymarket.fetchMarkets({ limit, offset, active: true, closed: false });
    console.log(`[Polymarket] Got ${markets.length} markets`);
    if (markets.length === 0) break;

    for (const market of markets) {
      const prices = polymarket.parsePrices(market);

      await db
        .insert(schema.markets)
        .values({
          platformId,
          externalId: market.id,
          title: market.question,
          status: market.closed ? "closed" : "active",
          yesPrice: prices.yes?.toString() ?? null,
          noPrice: prices.no?.toString() ?? null,
          volume24h: (parseFloat(market.volume24hr) || 0).toString(),
          liquidity: (parseFloat(market.liquidity) || 0).toString(),
          resolutionDate: market.endDate ? new Date(market.endDate) : null,
          url: `https://polymarket.com/event/${market.slug}`,
          metadata: {
            conditionId: market.conditionId,
            clobTokenIds: market.clobTokenIds,
            acceptingOrders: market.acceptingOrders,
          },
        })
        .onConflictDoUpdate({
          target: [schema.markets.platformId, schema.markets.externalId],
          set: {
            title: market.question,
            status: market.closed ? "closed" : "active",
            yesPrice: prices.yes?.toString() ?? null,
            noPrice: prices.no?.toString() ?? null,
            volume24h: (parseFloat(market.volume24hr) || 0).toString(),
            liquidity: (parseFloat(market.liquidity) || 0).toString(),
            resolutionDate: market.endDate ? new Date(market.endDate) : null,
            updatedAt: new Date(),
          },
        });
      count++;
    }

    offset += limit;
    if (markets.length < limit || offset / limit >= maxPages) break;
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

      await db
        .insert(schema.markets)
        .values({
          platformId,
          externalId: market.ticker,
          title: market.title,
          category: market.category,
          status: market.status === "active" ? "active" : "closed",
          yesPrice: prices.yes?.toString() ?? null,
          noPrice: prices.no?.toString() ?? null,
          volume24h: market.volume_24h?.toString() ?? null,
          liquidity: market.liquidity?.toString() ?? null,
          resolutionDate: new Date(market.expiration_time),
          url: `https://kalshi.com/markets/${market.ticker}`,
          metadata: {
            eventTicker: market.event_ticker,
            subtitle: market.subtitle,
            openInterest: market.open_interest,
          },
        })
        .onConflictDoUpdate({
          target: [schema.markets.platformId, schema.markets.externalId],
          set: {
            title: market.title,
            category: market.category,
            status: market.status === "active" ? "active" : "closed",
            yesPrice: prices.yes?.toString() ?? null,
            noPrice: prices.no?.toString() ?? null,
            volume24h: market.volume_24h?.toString() ?? null,
            liquidity: market.liquidity?.toString() ?? null,
            resolutionDate: new Date(market.expiration_time),
            updatedAt: new Date(),
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
