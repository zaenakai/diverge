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

import prisma from "../db.js";
import { Prisma } from "@prisma/client";

// ── CORS + Routing ──────────────────────────────────

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

    // Order matters — more specific routes first
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
      body: JSON.stringify(body, (_key, value) =>
        // Prisma Decimal → number for JSON
        typeof value === "object" && value !== null && value.constructor?.name === "Decimal"
          ? Number(value)
          : value
      ),
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

/** Convert Prisma Decimal fields to plain numbers for serialization */
function decimalToNumber(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (obj.constructor?.name === "Decimal") return Number(obj);
  if (Array.isArray(obj)) return obj.map(decimalToNumber);
  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    result[key] = decimalToNumber(val);
  }
  return result;
}

// ── GET /stats ──────────────────────────────────────

async function getStats() {
  const [
    totalMarkets,
    polymarketMarkets,
    kalshiMarkets,
    totalMatched,
    activeArbs,
    avgBrierResult,
    volume24hResult,
  ] = await Promise.all([
    prisma.market.count(),
    prisma.market.count({
      where: { platform: { slug: "polymarket" } },
    }),
    prisma.market.count({
      where: { platform: { slug: "kalshi" } },
    }),
    prisma.marketMatch.count(),
    prisma.arbOpportunity.count({
      where: { closedAt: null },
    }),
    prisma.accuracyRecord.aggregate({
      _avg: { brierScore: true },
    }),
    prisma.market.aggregate({
      _sum: { volume24h: true },
    }),
  ]);

  return {
    totalMarkets,
    polymarketMarkets,
    kalshiMarkets,
    totalMatched,
    activeArbs,
    avgBrierScore: avgBrierResult._avg.brierScore
      ? Number(avgBrierResult._avg.brierScore)
      : null,
    totalVolume24h: volume24hResult._sum.volume24h
      ? Number(volume24hResult._sum.volume24h)
      : 0,
  };
}

// ── GET /markets ────────────────────────────────────

async function getMarkets(params: Record<string, string>) {
  const limit = Math.min(toNumber(params.limit, 50), 200);
  const offset = toNumber(params.offset, 0);
  const { platform, category, status, search } = params;

  const where: Prisma.MarketWhereInput = {};

  if (platform && platform !== "all") {
    where.platform = { slug: platform };
  }
  if (category) {
    where.category = category;
  }
  if (status) {
    where.status = status;
  } else {
    // Default to active markets
    where.status = "active";
  }
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  const [markets, total] = await Promise.all([
    prisma.market.findMany({
      where,
      include: {
        platform: { select: { slug: true, name: true } },
      },
      orderBy: { volume24h: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.market.count({ where }),
  ]);

  return {
    markets: markets.map(decimalToNumber),
    total,
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

  const market = await prisma.market.findUnique({
    where: { id: marketId },
    include: {
      platform: { select: { slug: true, name: true } },
      priceSnapshots: {
        orderBy: { recordedAt: "desc" },
        take: 500,
        select: {
          yesPrice: true,
          noPrice: true,
          volume24h: true,
          liquidity: true,
          recordedAt: true,
        },
      },
      matchesAsA: {
        include: {
          marketB: {
            include: { platform: { select: { slug: true, name: true } } },
          },
        },
      },
      matchesAsB: {
        include: {
          marketA: {
            include: { platform: { select: { slug: true, name: true } } },
          },
        },
      },
    },
  });

  if (!market) {
    return { error: "Market not found" };
  }

  // Combine matches from both sides
  const matches = [
    ...market.matchesAsA.map((m) => ({
      matchId: m.id,
      confidence: m.confidence,
      matchMethod: m.matchMethod,
      otherMarket: decimalToNumber(m.marketB),
    })),
    ...market.matchesAsB.map((m) => ({
      matchId: m.id,
      confidence: m.confidence,
      matchMethod: m.matchMethod,
      otherMarket: decimalToNumber(m.marketA),
    })),
  ];

  const { matchesAsA, matchesAsB, ...marketData } = market;

  return {
    market: decimalToNumber(marketData),
    matches,
    priceHistory: market.priceSnapshots.reverse().map(decimalToNumber),
  };
}

// ── GET /matches ────────────────────────────────────

async function getMatches(params: Record<string, string>) {
  const limit = Math.min(toNumber(params.limit, 50), 200);
  const offset = toNumber(params.offset, 0);
  const { category } = params;

  const where: Prisma.MarketMatchWhereInput = {};

  if (category) {
    where.OR = [
      { marketA: { category } },
      { marketB: { category } },
    ];
  }

  const matches = await prisma.marketMatch.findMany({
    where,
    include: {
      marketA: {
        include: { platform: { select: { slug: true, name: true } } },
      },
      marketB: {
        include: { platform: { select: { slug: true, name: true } } },
      },
    },
    orderBy: { confidence: "desc" },
    take: limit,
    skip: offset,
  });

  // Calculate spread and sort by it
  const withSpread = matches.map((match) => {
    const priceA = match.marketA.yesPrice ? Number(match.marketA.yesPrice) : 0;
    const priceB = match.marketB.yesPrice ? Number(match.marketB.yesPrice) : 0;
    const spread = Math.abs(priceA - priceB);

    return {
      id: match.id,
      confidence: match.confidence,
      matchMethod: match.matchMethod,
      verified: match.verified,
      createdAt: match.createdAt,
      spread: Math.round(spread * 10000) / 100, // as percentage points
      marketA: decimalToNumber(match.marketA),
      marketB: decimalToNumber(match.marketB),
    };
  });

  // Sort by spread descending (biggest arbs first)
  withSpread.sort((a, b) => b.spread - a.spread);

  const total = await prisma.marketMatch.count({ where });

  return { matches: withSpread, total, limit, offset };
}

// ── GET /arbs ───────────────────────────────────────

async function getArbs(params: Record<string, string>) {
  const limit = Math.min(toNumber(params.limit, 50), 200);
  const offset = toNumber(params.offset, 0);
  const minSpread = toNumber(params.min_spread, 0) / 100; // convert percentage to decimal
  const { category, direction } = params;

  const where: Prisma.ArbOpportunityWhereInput = {
    closedAt: null, // only active arbs
  };

  if (minSpread > 0) {
    where.spreadRaw = { gte: minSpread };
  }

  if (category) {
    where.match = {
      OR: [
        { marketA: { category } },
        { marketB: { category } },
      ],
    };
  }

  const arbs = await prisma.arbOpportunity.findMany({
    where,
    include: {
      match: {
        include: {
          marketA: {
            include: { platform: { select: { slug: true, name: true } } },
          },
          marketB: {
            include: { platform: { select: { slug: true, name: true } } },
          },
        },
      },
    },
    orderBy: { spreadAdjusted: "desc" },
    take: limit,
    skip: offset,
  });

  // Filter by direction (widening/narrowing) post-query if needed
  let results = arbs.map((arb) => {
    const matchData = arb.match;
    return {
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
      marketA: decimalToNumber(matchData.marketA),
      marketB: decimalToNumber(matchData.marketB),
      confidence: matchData.confidence,
    };
  });

  // Direction filter: compare current spread to spread at detection
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

  const total = await prisma.arbOpportunity.count({ where });

  return { arbs: results, total, limit, offset };
}

// ── GET /accuracy ───────────────────────────────────

async function getAccuracy(params: Record<string, string>) {
  const { platform: platformFilter } = params;

  // Overall stats per platform
  const platformStats = await prisma.accuracyRecord.groupBy({
    by: ["platformId"],
    _avg: { brierScore: true },
    _count: { id: true },
  });

  // Resolve platform names
  const platforms = await prisma.platform.findMany({
    select: { id: true, slug: true, name: true },
  });
  const platformMap = new Map(platforms.map((p) => [p.id, p]));

  const byPlatform = platformStats.map((stat) => {
    const plat = platformMap.get(stat.platformId);
    return {
      platformId: stat.platformId,
      slug: plat?.slug ?? "unknown",
      name: plat?.name ?? "Unknown",
      avgBrierScore: stat._avg.brierScore ? Number(stat._avg.brierScore) : null,
      totalResolved: stat._count.id,
    };
  });

  // By category
  const categoryStats = await prisma.accuracyRecord.groupBy({
    by: ["category", "platformId"],
    _avg: { brierScore: true },
    _count: { id: true },
  });

  // Group by category, with per-platform scores
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
      avg: stat._avg.brierScore ? Number(stat._avg.brierScore) : 0,
      count: stat._count.id,
    };
  }

  // Notable misses (worst Brier scores)
  const notableMissesWhere: Prisma.AccuracyRecordWhereInput = {
    brierScore: { not: null },
  };
  if (platformFilter && platformFilter !== "all") {
    notableMissesWhere.platform = { slug: platformFilter };
  }

  const notableMisses = await prisma.accuracyRecord.findMany({
    where: notableMissesWhere,
    orderBy: { brierScore: "desc" },
    take: 20,
    include: {
      market: { select: { title: true, category: true, outcome: true } },
      platform: { select: { slug: true, name: true } },
    },
  });

  return {
    byPlatform,
    byCategory: Array.from(categoryMap.values()),
    notableMisses: notableMisses.map((m) => ({
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
  // Get all accuracy records with final prices
  const records = await prisma.accuracyRecord.findMany({
    where: {
      finalPrice: { not: null },
      outcome: { not: null },
    },
    select: {
      finalPrice: true,
      outcome: true,
      platformId: true,
    },
  });

  const platforms = await prisma.platform.findMany({
    select: { id: true, slug: true },
  });
  const platformMap = new Map(platforms.map((p) => [p.id, p.slug]));

  // Bucket into 10% ranges: 0-10%, 10-20%, ..., 90-100%
  const buckets: Map<
    number,
    {
      predicted: number;
      outcomes: Record<string, { total: number; yesCount: number }>;
    }
  > = new Map();

  for (let i = 0; i < 10; i++) {
    const midpoint = (i * 10 + 5) / 100; // 0.05, 0.15, 0.25, ...
    buckets.set(i, {
      predicted: midpoint,
      outcomes: {},
    });
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

  const [trades, total] = await Promise.all([
    prisma.whaleTrade.findMany({
      orderBy: { sizeUsd: "desc" },
      take: limit,
      skip: offset,
      include: {
        market: {
          select: { id: true, title: true, category: true, yesPrice: true, noPrice: true },
        },
        platform: { select: { slug: true, name: true } },
      },
    }),
    prisma.whaleTrade.count(),
  ]);

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
    total,
    limit,
    offset,
  };
}
