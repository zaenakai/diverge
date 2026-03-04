/**
 * API handler — serves dashboard data
 *
 * Deployed as Lambda function URL.
 * Routes:
 *   GET /stats         — dashboard overview stats
 *   GET /markets       — market explorer (search, filter, paginate)
 *   GET /markets/:id   — market detail with price history
 *   GET /matches       — cross-platform matched markets
 *   GET /arbs          — current arb opportunities
 *   GET /accuracy      — accuracy leaderboard
 *   GET /accuracy/calibration — calibration curve data
 *   GET /whales        — recent large trades
 */

import { db, schema } from "../../../core/src/db/index.js";
import {
  eq,
  and,
  or,
  desc,
  asc,
  sql,
  count,
  avg,
  sum,
  isNull,
  isNotNull,
  ilike,
  gte,
} from "drizzle-orm";

// ── CORS + Routing ──────────────────────────────────

const HEADERS = {
  "Content-Type": "application/json",
};

export async function handler(event: any) {
  const path = event.rawPath || "/";
  const method = event.requestContext?.http?.method || "GET";
  const params: Record<string, string> = event.queryStringParameters || {};

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: HEADERS };
  }

  try {
    let body: unknown;

    if (path === "/accuracy/calibration") {
      body = await getCalibration();
    } else if (path === "/accuracy") {
      body = await getAccuracy(params);
    } else if (path === "/stats") {
      body = await getStats();
    } else if (path === "/markets" && !path.includes("/markets/")) {
      body = await getMarkets(params);
    } else if (path.startsWith("/markets/")) {
      const id = path.split("/")[2];
      body = await getMarketDetail(id);
    } else if (path === "/matches") {
      body = await getMatches(params);
    } else if (path === "/arbs") {
      body = await getArbs(params);
    } else if (path === "/whales") {
      body = await getWhales(params);
    } else {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({ error: "Not found" }),
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify(body),
    };
  } catch (err: any) {
    console.error("API error:", err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message ?? "Internal server error" }),
    };
  }
}

// ── Helpers ──────────────────────────────────────────

function toNumber(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/** Convert string decimal fields to numbers for JSON */
function numericFields(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(numericFields);
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (
      typeof val === "string" &&
      ["yesPrice", "noPrice", "volume24h", "liquidity", "spreadRaw", "spreadAdjusted",
       "buyPrice", "sellPrice", "volumeMin", "sizeUsd", "price", "finalPrice",
       "outcome", "brierScore", "yes_price", "no_price", "volume_24h",
       "spread_raw", "spread_adjusted", "buy_price", "sell_price", "volume_min",
       "size_usd", "final_price", "brier_score"].includes(key) &&
      !isNaN(Number(val))
    ) {
      result[key] = Number(val);
    } else if (typeof val === "object" && val !== null) {
      result[key] = numericFields(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

// ── GET /stats ──────────────────────────────────────

async function getStats() {
  const [
    totalMarketsResult,
    polymarketResult,
    kalshiResult,
    totalMatchedResult,
    activeArbsResult,
    avgBrierResult,
    volume24hResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(schema.markets),
    db
      .select({ count: count() })
      .from(schema.markets)
      .innerJoin(schema.platforms, eq(schema.markets.platformId, schema.platforms.id))
      .where(eq(schema.platforms.slug, "polymarket")),
    db
      .select({ count: count() })
      .from(schema.markets)
      .innerJoin(schema.platforms, eq(schema.markets.platformId, schema.platforms.id))
      .where(eq(schema.platforms.slug, "kalshi")),
    db.select({ count: count() }).from(schema.marketMatches),
    db
      .select({ count: count() })
      .from(schema.arbOpportunities)
      .where(isNull(schema.arbOpportunities.closedAt)),
    db
      .select({ avg: avg(schema.accuracyRecords.brierScore) })
      .from(schema.accuracyRecords),
    db
      .select({ sum: sum(schema.markets.volume24h) })
      .from(schema.markets),
  ]);

  return {
    totalMarkets: totalMarketsResult[0].count,
    polymarketMarkets: polymarketResult[0].count,
    kalshiMarkets: kalshiResult[0].count,
    totalMatched: totalMatchedResult[0].count,
    activeArbs: activeArbsResult[0].count,
    avgBrierScore: avgBrierResult[0].avg ? Number(avgBrierResult[0].avg) : null,
    totalVolume24h: volume24hResult[0].sum ? Number(volume24hResult[0].sum) : 0,
  };
}

// ── GET /markets ────────────────────────────────────

async function getMarkets(params: Record<string, string>) {
  const limit = Math.min(toNumber(params.limit, 50), 200);
  const offset = toNumber(params.offset, 0);
  const { platform, category, status, search } = params;

  const conditions: any[] = [];

  if (platform && platform !== "all") {
    // Need to join with platforms
  }
  if (category) {
    conditions.push(eq(schema.markets.category, category));
  }
  if (status) {
    conditions.push(eq(schema.markets.status, status));
  } else {
    conditions.push(eq(schema.markets.status, "active"));
  }
  if (search) {
    conditions.push(ilike(schema.markets.title, `%${search}%`));
  }

  // Use query API for includes
  const marketsData = await db.query.markets.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      platform: {
        columns: { slug: true, name: true },
      },
    },
    orderBy: [desc(schema.markets.volume24h)],
    limit,
    offset,
  });

  // Filter by platform slug if needed (post-query since relational query doesn't support join filtering easily)
  let filtered = marketsData;
  if (platform && platform !== "all") {
    filtered = marketsData.filter((m) => m.platform.slug === platform);
  }

  // Get total count
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const totalResult = await db
    .select({ count: count() })
    .from(schema.markets)
    .where(where);

  return {
    markets: filtered.map(numericFields),
    total: totalResult[0].count,
    limit,
    offset,
  };
}

// ── GET /markets/:id ────────────────────────────────

async function getMarketDetail(id: string) {
  const marketId = Number(id);
  if (!Number.isFinite(marketId)) {
    return { error: "Invalid market ID" };
  }

  const market = await db.query.markets.findFirst({
    where: eq(schema.markets.id, marketId),
    with: {
      platform: { columns: { slug: true, name: true } },
      priceSnapshots: {
        orderBy: [desc(schema.priceSnapshots.recordedAt)],
        limit: 500,
        columns: {
          yesPrice: true,
          noPrice: true,
          volume24h: true,
          liquidity: true,
          recordedAt: true,
        },
      },
      matchesAsA: {
        with: {
          marketB: {
            with: { platform: { columns: { slug: true, name: true } } },
          },
        },
      },
      matchesAsB: {
        with: {
          marketA: {
            with: { platform: { columns: { slug: true, name: true } } },
          },
        },
      },
    },
  });

  if (!market) {
    return { error: "Market not found" };
  }

  const matches = [
    ...market.matchesAsA.map((m) => ({
      matchId: m.id,
      confidence: m.confidence,
      matchMethod: m.matchMethod,
      otherMarket: numericFields(m.marketB),
    })),
    ...market.matchesAsB.map((m) => ({
      matchId: m.id,
      confidence: m.confidence,
      matchMethod: m.matchMethod,
      otherMarket: numericFields(m.marketA),
    })),
  ];

  const { matchesAsA, matchesAsB, priceSnapshots, ...marketData } = market;

  return {
    market: numericFields(marketData),
    matches,
    priceHistory: priceSnapshots.reverse().map(numericFields),
  };
}

// ── GET /matches ────────────────────────────────────

async function getMatches(params: Record<string, string>) {
  const limit = Math.min(toNumber(params.limit, 50), 200);
  const offset = toNumber(params.offset, 0);

  const matchesData = await db.query.marketMatches.findMany({
    with: {
      marketA: { with: { platform: { columns: { slug: true, name: true } } } },
      marketB: { with: { platform: { columns: { slug: true, name: true } } } },
    },
    orderBy: [desc(schema.marketMatches.confidence)],
    limit,
    offset,
  });

  const withSpread = matchesData.map((match) => {
    const priceA = match.marketA.yesPrice ? Number(match.marketA.yesPrice) : 0;
    const priceB = match.marketB.yesPrice ? Number(match.marketB.yesPrice) : 0;
    const spread = Math.abs(priceA - priceB);

    return {
      id: match.id,
      confidence: match.confidence,
      matchMethod: match.matchMethod,
      verified: match.verified,
      createdAt: match.createdAt,
      spread: Math.round(spread * 10000) / 100,
      marketA: numericFields(match.marketA),
      marketB: numericFields(match.marketB),
    };
  });

  withSpread.sort((a, b) => b.spread - a.spread);

  const totalResult = await db.select({ count: count() }).from(schema.marketMatches);

  return { matches: withSpread, total: totalResult[0].count, limit, offset };
}

// ── GET /arbs ───────────────────────────────────────

async function getArbs(params: Record<string, string>) {
  const limit = Math.min(toNumber(params.limit, 50), 200);
  const offset = toNumber(params.offset, 0);
  const minSpread = toNumber(params.min_spread, 0) / 100;
  const { direction } = params;

  const conditions: any[] = [isNull(schema.arbOpportunities.closedAt)];

  if (minSpread > 0) {
    conditions.push(gte(schema.arbOpportunities.spreadRaw, minSpread.toString()));
  }

  const arbs = await db.query.arbOpportunities.findMany({
    where: and(...conditions),
    with: {
      match: {
        with: {
          marketA: { with: { platform: { columns: { slug: true, name: true } } } },
          marketB: { with: { platform: { columns: { slug: true, name: true } } } },
        },
      },
    },
    orderBy: [desc(schema.arbOpportunities.spreadAdjusted)],
    limit,
    offset,
  });

  let results = arbs.map((arb) => ({
    id: arb.id,
    matchId: arb.matchId,
    spreadRaw: arb.spreadRaw ? Number(arb.spreadRaw) : null,
    spreadAdjusted: arb.spreadAdjusted ? Number(arb.spreadAdjusted) : null,
    buyPlatform: arb.buyPlatform,
    buyPrice: arb.buyPrice ? Number(arb.buyPrice) : null,
    sellPrice: arb.sellPrice ? Number(arb.sellPrice) : null,
    volumeMin: arb.volumeMin ? Number(arb.volumeMin) : null,
    detectedAt: arb.detectedAt,
    closedAt: arb.closedAt,
    profitable: arb.profitable,
    marketA: numericFields(arb.match.marketA),
    marketB: numericFields(arb.match.marketB),
    confidence: arb.match.confidence,
  }));

  if (direction === "widening" || direction === "narrowing") {
    results = results.filter((arb) => {
      const currentSpread = arb.spreadRaw ?? 0;
      const priceA = arb.marketA.yesPrice ?? 0;
      const priceB = arb.marketB.yesPrice ?? 0;
      const liveSpread = Math.abs(priceA - priceB);
      if (direction === "widening") return liveSpread > currentSpread;
      return liveSpread < currentSpread;
    });
  }

  const totalResult = await db
    .select({ count: count() })
    .from(schema.arbOpportunities)
    .where(and(...conditions));

  return { arbs: results, total: totalResult[0].count, limit, offset };
}

// ── GET /accuracy ───────────────────────────────────

async function getAccuracy(params: Record<string, string>) {
  const { platform: platformFilter } = params;

  // Overall stats per platform using raw SQL for groupBy with aggregates
  const platformStats = await db
    .select({
      platformId: schema.accuracyRecords.platformId,
      avgBrier: avg(schema.accuracyRecords.brierScore),
      total: count(schema.accuracyRecords.id),
    })
    .from(schema.accuracyRecords)
    .groupBy(schema.accuracyRecords.platformId);

  const allPlatforms = await db
    .select({ id: schema.platforms.id, slug: schema.platforms.slug, name: schema.platforms.name })
    .from(schema.platforms);
  const platformMap = new Map(allPlatforms.map((p) => [p.id, p]));

  const byPlatform = platformStats.map((stat) => {
    const plat = platformMap.get(stat.platformId);
    return {
      platformId: stat.platformId,
      slug: plat?.slug ?? "unknown",
      name: plat?.name ?? "Unknown",
      avgBrierScore: stat.avgBrier ? Number(stat.avgBrier) : null,
      totalResolved: stat.total,
    };
  });

  // By category
  const categoryStats = await db
    .select({
      category: schema.accuracyRecords.category,
      platformId: schema.accuracyRecords.platformId,
      avgBrier: avg(schema.accuracyRecords.brierScore),
      total: count(schema.accuracyRecords.id),
    })
    .from(schema.accuracyRecords)
    .groupBy(schema.accuracyRecords.category, schema.accuracyRecords.platformId);

  const categoryMap = new Map<
    string,
    { category: string; platforms: Record<string, { avg: number; count: number }> }
  >();

  for (const stat of categoryStats) {
    const cat = stat.category ?? "uncategorized";
    const plat = platformMap.get(stat.platformId);
    const slug = plat?.slug ?? "unknown";

    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { category: cat, platforms: {} });
    }
    categoryMap.get(cat)!.platforms[slug] = {
      avg: stat.avgBrier ? Number(stat.avgBrier) : 0,
      count: stat.total,
    };
  }

  // Notable misses (worst Brier scores)
  const missConditions: any[] = [isNotNull(schema.accuracyRecords.brierScore)];

  const notableMisses = await db.query.accuracyRecords.findMany({
    where: and(...missConditions),
    orderBy: [desc(schema.accuracyRecords.brierScore)],
    limit: 20,
    with: {
      market: {
        columns: { title: true, category: true, outcome: true },
      },
      platform: {
        columns: { slug: true, name: true },
      },
    },
  });

  // Filter by platform post-query if needed
  let filteredMisses = notableMisses;
  if (platformFilter && platformFilter !== "all") {
    filteredMisses = notableMisses.filter((m) => m.platform.slug === platformFilter);
  }

  return {
    byPlatform,
    byCategory: Array.from(categoryMap.values()),
    notableMisses: filteredMisses.map((m) => ({
      id: m.id,
      marketTitle: m.market.title,
      category: m.market.category,
      platform: m.platform.slug,
      finalPrice: m.finalPrice ? Number(m.finalPrice) : null,
      outcome: m.outcome ? Number(m.outcome) : null,
      brierScore: m.brierScore ? Number(m.brierScore) : null,
      resolvedAt: m.resolvedAt,
    })),
  };
}

// ── GET /accuracy/calibration ───────────────────────

async function getCalibration() {
  const records = await db
    .select({
      finalPrice: schema.accuracyRecords.finalPrice,
      outcome: schema.accuracyRecords.outcome,
      platformId: schema.accuracyRecords.platformId,
    })
    .from(schema.accuracyRecords)
    .where(
      and(
        isNotNull(schema.accuracyRecords.finalPrice),
        isNotNull(schema.accuracyRecords.outcome)
      )
    );

  const allPlatforms = await db
    .select({ id: schema.platforms.id, slug: schema.platforms.slug })
    .from(schema.platforms);
  const platformMap = new Map(allPlatforms.map((p) => [p.id, p.slug]));

  const buckets: Map<
    number,
    {
      predicted: number;
      outcomes: Record<string, { total: number; yesCount: number }>;
    }
  > = new Map();

  for (let i = 0; i < 10; i++) {
    const midpoint = (i * 10 + 5) / 100;
    buckets.set(i, { predicted: midpoint, outcomes: {} });
  }

  for (const record of records) {
    const price = Number(record.finalPrice);
    const outcome = Number(record.outcome);
    const slug = platformMap.get(record.platformId) ?? "unknown";

    const bucketIndex = Math.min(Math.floor(price * 10), 9);
    const bucket = buckets.get(bucketIndex)!;

    if (!bucket.outcomes[slug]) {
      bucket.outcomes[slug] = { total: 0, yesCount: 0 };
    }
    bucket.outcomes[slug].total++;
    bucket.outcomes[slug].yesCount += outcome;
  }

  return {
    buckets: Array.from(buckets.values()).map((b) => ({
      predicted: b.predicted,
      platforms: Object.fromEntries(
        Object.entries(b.outcomes).map(([slug, data]) => [
          slug,
          {
            actual: data.total > 0 ? data.yesCount / data.total : 0,
            sampleSize: data.total,
          },
        ])
      ),
    })),
  };
}

// ── GET /whales ─────────────────────────────────────

async function getWhales(params: Record<string, string>) {
  const limit = Math.min(toNumber(params.limit, 50), 200);
  const offset = toNumber(params.offset, 0);

  const trades = await db.query.whaleTrades.findMany({
    orderBy: [desc(schema.whaleTrades.sizeUsd)],
    limit,
    offset,
    with: {
      market: {
        columns: { id: true, title: true, category: true, yesPrice: true, noPrice: true },
      },
      platform: {
        columns: { slug: true, name: true },
      },
    },
  });

  const totalResult = await db.select({ count: count() }).from(schema.whaleTrades);

  return {
    trades: trades.map((t) => ({
      id: t.id,
      marketId: t.marketId,
      marketTitle: t.market.title,
      marketCategory: t.market.category,
      traderAddress: t.traderAddress,
      sizeUsd: Number(t.sizeUsd),
      side: t.side,
      price: t.price ? Number(t.price) : null,
      platform: t.platform.slug,
      platformName: t.platform.name,
      detectedAt: t.detectedAt,
    })),
    total: totalResult[0].count,
    limit,
    offset,
  };
}
