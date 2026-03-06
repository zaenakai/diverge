/**
 * Whale Trades Collector — runs every 2 minutes
 *
 * Fetches recent large trades (≥$10K) from Polymarket and Kalshi,
 * matches them to our markets, and inserts into whale_trades table.
 */

import { db, schema } from "../../../core/src/db/index";
import { eq, and, sql, gte } from "drizzle-orm";

const WHALE_THRESHOLD_USD = 10_000;
const POLYMARKET_TRADES_URL = "https://data-api.polymarket.com/trades";
const KALSHI_TRADES_URL = "https://api.elections.kalshi.com/trade-api/v2/markets/trades";

// Platform IDs (verified from DB)
const POLYMARKET_PLATFORM_ID = 1;
const KALSHI_PLATFORM_ID = 2;

// ── Helpers ──────────────────────────────────────────

async function fetchJson(url: string, retries = 1): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429 && attempt < retries) {
        console.log(`[Whales] Rate limited, backing off...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      }

      return await res.json();
    } catch (err: any) {
      if (attempt < retries) {
        console.log(`[Whales] Fetch failed (attempt ${attempt + 1}), retrying: ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

/** Check if we already have a trade (dedup within 1 minute window) */
async function isDuplicate(
  traderAddress: string | null,
  marketId: number,
  detectedAt: Date
): Promise<boolean> {
  const windowStart = new Date(detectedAt.getTime() - 60_000);
  const windowEnd = new Date(detectedAt.getTime() + 60_000);

  const conditions = [
    eq(schema.whaleTrades.marketId, marketId),
    gte(schema.whaleTrades.detectedAt, windowStart),
    sql`${schema.whaleTrades.detectedAt} <= ${windowEnd}`,
  ];

  if (traderAddress) {
    conditions.push(eq(schema.whaleTrades.traderAddress, traderAddress));
  }

  const existing = await db
    .select({ id: schema.whaleTrades.id })
    .from(schema.whaleTrades)
    .where(and(...conditions))
    .limit(1);

  return existing.length > 0;
}

// ── Polymarket Collector ─────────────────────────────

interface PolymarketTrade {
  proxyWallet: string;
  side: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  outcome: string;
  outcomeIndex: number;
  transactionHash: string;
}

async function collectPolymarket(): Promise<{ found: number; inserted: number; volume: number }> {
  let found = 0;
  let inserted = 0;
  let volume = 0;

  try {
    // Fetch up to 1000 most recent trades
    const trades: PolymarketTrade[] = await fetchJson(
      `${POLYMARKET_TRADES_URL}?limit=1000`
    );

    if (!Array.isArray(trades)) {
      console.log("[Whales/Polymarket] Unexpected response format");
      return { found, inserted, volume };
    }

    // Filter for whale trades (size * price >= threshold)
    const whaleTrades = trades.filter((t) => {
      const usdValue = (t.size || 0) * (t.price || 0);
      return usdValue >= WHALE_THRESHOLD_USD;
    });

    found = whaleTrades.length;
    console.log(`[Whales/Polymarket] ${trades.length} trades scanned, ${found} whales found`);

    if (found === 0) return { found, inserted, volume };

    // Batch lookup: find all matching markets by conditionId
    const conditionIds = [...new Set(whaleTrades.map((t) => t.conditionId))];

    // Query markets that have these conditionIds in metadata
    const matchingMarkets = await db
      .select({
        id: schema.markets.id,
        conditionId: sql<string>`${schema.markets.metadata}->>'conditionId'`,
      })
      .from(schema.markets)
      .where(
        and(
          eq(schema.markets.platformId, POLYMARKET_PLATFORM_ID),
          sql`${schema.markets.metadata}->>'conditionId' = ANY(${sql`ARRAY[${sql.join(conditionIds.map(c => sql`${c}`), sql`, `)}]`}::text[])`
        )
      );

    const conditionToMarketId = new Map<string, number>();
    for (const m of matchingMarkets) {
      if (m.conditionId) conditionToMarketId.set(m.conditionId, m.id);
    }

    console.log(`[Whales/Polymarket] Matched ${conditionToMarketId.size}/${conditionIds.length} condition IDs to markets`);

    for (const trade of whaleTrades) {
      const marketId = conditionToMarketId.get(trade.conditionId);
      if (!marketId) continue;

      const usdValue = trade.size * trade.price;
      const detectedAt = new Date(trade.timestamp * 1000);

      // Dedup check
      const isDup = await isDuplicate(trade.proxyWallet, marketId, detectedAt);
      if (isDup) continue;

      await db.insert(schema.whaleTrades).values({
        marketId,
        traderAddress: trade.proxyWallet,
        sizeUsd: usdValue.toFixed(2),
        side: trade.side.toLowerCase(),
        price: trade.price.toFixed(4),
        platformId: POLYMARKET_PLATFORM_ID,
        detectedAt,
      });

      inserted++;
      volume += usdValue;
    }
  } catch (err: any) {
    console.error(`[Whales/Polymarket] Error: ${err.message}`);
  }

  return { found, inserted, volume };
}

// ── Kalshi Collector ─────────────────────────────────

interface KalshiTrade {
  trade_id: string;
  ticker: string;
  count: number;
  yes_price: number;
  yes_price_dollars: string;
  no_price: number;
  no_price_dollars: string;
  taker_side: string;
  created_time: string;
  count_fp: string;
}

async function collectKalshi(): Promise<{ found: number; inserted: number; volume: number }> {
  let found = 0;
  let inserted = 0;
  let volume = 0;

  try {
    let cursor: string | undefined;
    let totalScanned = 0;
    const maxPages = 5; // Safety limit
    let page = 0;

    while (page < maxPages) {
      const url = cursor
        ? `${KALSHI_TRADES_URL}?limit=1000&cursor=${cursor}`
        : `${KALSHI_TRADES_URL}?limit=1000`;

      const data = await fetchJson(url);
      const trades: KalshiTrade[] = data?.trades ?? [];

      if (trades.length === 0) break;

      totalScanned += trades.length;

      // Filter for whale trades
      // Kalshi: count = number of contracts, each contract is $1 max payout
      // USD value of trade = count * (price in dollars)
      const whaleTrades = trades.filter((t) => {
        const priceDollars = parseFloat(t.yes_price_dollars || "0");
        const usdValue = (parseFloat(t.count_fp) || t.count) * priceDollars;
        return usdValue >= WHALE_THRESHOLD_USD;
      });

      if (whaleTrades.length > 0) {
        found += whaleTrades.length;

        // Extract unique tickers for batch market lookup
        // Kalshi ticker format: KXEVENT-SUBMARKET
        // Our external_id stores the full ticker
        const tickers = [...new Set(whaleTrades.map((t) => t.ticker))];

        const matchingMarkets = await db
          .select({
            id: schema.markets.id,
            externalId: schema.markets.externalId,
          })
          .from(schema.markets)
          .where(
            and(
              eq(schema.markets.platformId, KALSHI_PLATFORM_ID),
              sql`${schema.markets.externalId} = ANY(${sql`ARRAY[${sql.join(tickers.map(t => sql`${t}`), sql`, `)}]`}::text[])`
            )
          );

        const tickerToMarketId = new Map<string, number>();
        for (const m of matchingMarkets) {
          tickerToMarketId.set(m.externalId, m.id);
        }

        for (const trade of whaleTrades) {
          const marketId = tickerToMarketId.get(trade.ticker);
          if (!marketId) continue;

          const priceDollars = parseFloat(trade.yes_price_dollars || "0");
          const count = parseFloat(trade.count_fp) || trade.count;
          const usdValue = count * priceDollars;
          const detectedAt = new Date(trade.created_time);

          // Dedup check
          const isDup = await isDuplicate(null, marketId, detectedAt);
          if (isDup) continue;

          await db.insert(schema.whaleTrades).values({
            marketId,
            traderAddress: null, // Kalshi doesn't expose trader addresses
            sizeUsd: usdValue.toFixed(2),
            side: trade.taker_side.toLowerCase() === "yes" ? "buy" : "sell",
            price: priceDollars.toFixed(4),
            platformId: KALSHI_PLATFORM_ID,
            detectedAt,
          });

          inserted++;
          volume += usdValue;
        }
      }

      // Check if we should continue pagination
      // Only paginate if we found whales and there might be more recent trades
      cursor = data.cursor;
      if (!cursor || trades.length < 1000) break;

      // Only look at recent trades (within 5 minutes)
      const oldestTrade = trades[trades.length - 1];
      const oldestTime = new Date(oldestTrade.created_time).getTime();
      const fiveMinAgo = Date.now() - 5 * 60 * 1000;
      if (oldestTime < fiveMinAgo) break;

      page++;
    }

    console.log(`[Whales/Kalshi] ${totalScanned} trades scanned, ${found} whales found`);
  } catch (err: any) {
    console.error(`[Whales/Kalshi] Error: ${err.message}`);
  }

  return { found, inserted, volume };
}

// ── Handler ──────────────────────────────────────────

export async function handler() {
  console.log("[Whales] Starting whale trade collection...");

  const [polyResult, kalshiResult] = await Promise.all([
    collectPolymarket(),
    collectKalshi(),
  ]);

  const totalFound = polyResult.found + kalshiResult.found;
  const totalInserted = polyResult.inserted + kalshiResult.inserted;
  const totalVolume = polyResult.volume + kalshiResult.volume;

  console.log(`[Whales] Done — Found: ${totalFound}, Inserted: ${totalInserted}, Volume: $${totalVolume.toFixed(2)}`);
  console.log(`[Whales]   Polymarket: ${polyResult.found} found, ${polyResult.inserted} inserted, $${polyResult.volume.toFixed(2)}`);
  console.log(`[Whales]   Kalshi: ${kalshiResult.found} found, ${kalshiResult.inserted} inserted, $${kalshiResult.volume.toFixed(2)}`);

  return {
    statusCode: 200,
    body: {
      totalFound,
      totalInserted,
      totalVolume,
      polymarket: polyResult,
      kalshi: kalshiResult,
    },
  };
}
