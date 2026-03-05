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

import { db, schema } from "../../../core/src/db/index";
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
import { alias } from "drizzle-orm/pg-core";

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
    conditions.push(eq(schema.platforms.slug, platform));
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

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: schema.markets.id,
      platformId: schema.markets.platformId,
      externalId: schema.markets.externalId,
      title: schema.markets.title,
      description: schema.markets.description,
      category: schema.markets.category,
      status: schema.markets.status,
      resolutionDate: schema.markets.resolutionDate,
      resolvedAt: schema.markets.resolvedAt,
      outcome: schema.markets.outcome,
      url: schema.markets.url,
      yesPrice: schema.markets.yesPrice,
      noPrice: schema.markets.noPrice,
      volume24h: schema.markets.volume24h,
      liquidity: schema.markets.liquidity,
      metadata: schema.markets.metadata,
      createdAt: schema.markets.createdAt,
      updatedAt: schema.markets.updatedAt,
      platformSlug: schema.platforms.slug,
      platformName: schema.platforms.name,
    })
    .from(schema.markets)
    .innerJoin(schema.platforms, eq(schema.markets.platformId, schema.platforms.id))
    .where(where)
    .orderBy(desc(schema.markets.volume24h))
    .limit(limit)
    .offset(offset);

  const marketsData = rows.map((r) => {
    const { platformSlug, platformName, ...market } = r;
    return { ...market, platform: { slug: platformSlug, name: platformName } };
  });

  // Count query (without platform join if no platform filter)
  const countConditions: any[] = [];
  if (platform && platform !== "all") {
    // Need join for count too
  }
  if (category) countConditions.push(eq(schema.markets.category, category));
  if (status) countConditions.push(eq(schema.markets.status, status));
  else countConditions.push(eq(schema.markets.status, "active"));
  if (search) countConditions.push(ilike(schema.markets.title, `%${search}%`));

  let totalQuery;
  if (platform && platform !== "all") {
    totalQuery = db
      .select({ count: count() })
      .from(schema.markets)
      .innerJoin(schema.platforms, eq(schema.markets.platformId, schema.platforms.id))
      .where(and(eq(schema.platforms.slug, platform), ...countConditions));
  } else {
    totalQuery = db
      .select({ count: count() })
      .from(schema.markets)
      .where(countConditions.length > 0 ? and(...countConditions) : undefined);
  }

  const totalResult = await totalQuery;

  return {
    markets: marketsData.map(numericFields),
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

  // Query 1: Market + platform
  const marketRows = await db
    .select({
      id: schema.markets.id,
      platformId: schema.markets.platformId,
      externalId: schema.markets.externalId,
      title: schema.markets.title,
      description: schema.markets.description,
      category: schema.markets.category,
      status: schema.markets.status,
      resolutionDate: schema.markets.resolutionDate,
      resolvedAt: schema.markets.resolvedAt,
      outcome: schema.markets.outcome,
      url: schema.markets.url,
      yesPrice: schema.markets.yesPrice,
      noPrice: schema.markets.noPrice,
      volume24h: schema.markets.volume24h,
      liquidity: schema.markets.liquidity,
      metadata: schema.markets.metadata,
      createdAt: schema.markets.createdAt,
      updatedAt: schema.markets.updatedAt,
      platformSlug: schema.platforms.slug,
      platformName: schema.platforms.name,
    })
    .from(schema.markets)
    .innerJoin(schema.platforms, eq(schema.markets.platformId, schema.platforms.id))
    .where(eq(schema.markets.id, marketId))
    .limit(1);

  if (marketRows.length === 0) {
    return { error: "Market not found" };
  }

  const row = marketRows[0];
  const { platformSlug, platformName, ...marketFields } = row;
  const marketData = { ...marketFields, platform: { slug: platformSlug, name: platformName } };

  // Query 2: Price snapshots
  const priceSnapshots = await db
    .select({
      yesPrice: schema.priceSnapshots.yesPrice,
      noPrice: schema.priceSnapshots.noPrice,
      volume24h: schema.priceSnapshots.volume24h,
      liquidity: schema.priceSnapshots.liquidity,
      recordedAt: schema.priceSnapshots.recordedAt,
    })
    .from(schema.priceSnapshots)
    .where(eq(schema.priceSnapshots.marketId, marketId))
    .orderBy(desc(schema.priceSnapshots.recordedAt))
    .limit(500);

  // Query 3: Matches where this market is A — join marketB + its platform
  const otherMarket = alias(schema.markets, "otherMarket");
  const otherPlatform = alias(schema.platforms, "otherPlatform");

  const matchesAsA = await db
    .select({
      matchId: schema.marketMatches.id,
      confidence: schema.marketMatches.confidence,
      matchMethod: schema.marketMatches.matchMethod,
      otherMarketId: otherMarket.id,
      otherPlatformId: otherMarket.platformId,
      otherExternalId: otherMarket.externalId,
      otherTitle: otherMarket.title,
      otherDescription: otherMarket.description,
      otherCategory: otherMarket.category,
      otherStatus: otherMarket.status,
      otherResolutionDate: otherMarket.resolutionDate,
      otherResolvedAt: otherMarket.resolvedAt,
      otherOutcome: otherMarket.outcome,
      otherUrl: otherMarket.url,
      otherYesPrice: otherMarket.yesPrice,
      otherNoPrice: otherMarket.noPrice,
      otherVolume24h: otherMarket.volume24h,
      otherLiquidity: otherMarket.liquidity,
      otherMetadata: otherMarket.metadata,
      otherCreatedAt: otherMarket.createdAt,
      otherUpdatedAt: otherMarket.updatedAt,
      otherPlatformSlug: otherPlatform.slug,
      otherPlatformName: otherPlatform.name,
    })
    .from(schema.marketMatches)
    .innerJoin(otherMarket, eq(schema.marketMatches.marketBId, otherMarket.id))
    .innerJoin(otherPlatform, eq(otherMarket.platformId, otherPlatform.id))
    .where(eq(schema.marketMatches.marketAId, marketId));

  // Query 4: Matches where this market is B — join marketA + its platform
  const otherMarket2 = alias(schema.markets, "otherMarket2");
  const otherPlatform2 = alias(schema.platforms, "otherPlatform2");

  const matchesAsB = await db
    .select({
      matchId: schema.marketMatches.id,
      confidence: schema.marketMatches.confidence,
      matchMethod: schema.marketMatches.matchMethod,
      otherMarketId: otherMarket2.id,
      otherPlatformId: otherMarket2.platformId,
      otherExternalId: otherMarket2.externalId,
      otherTitle: otherMarket2.title,
      otherDescription: otherMarket2.description,
      otherCategory: otherMarket2.category,
      otherStatus: otherMarket2.status,
      otherResolutionDate: otherMarket2.resolutionDate,
      otherResolvedAt: otherMarket2.resolvedAt,
      otherOutcome: otherMarket2.outcome,
      otherUrl: otherMarket2.url,
      otherYesPrice: otherMarket2.yesPrice,
      otherNoPrice: otherMarket2.noPrice,
      otherVolume24h: otherMarket2.volume24h,
      otherLiquidity: otherMarket2.liquidity,
      otherMetadata: otherMarket2.metadata,
      otherCreatedAt: otherMarket2.createdAt,
      otherUpdatedAt: otherMarket2.updatedAt,
      otherPlatformSlug: otherPlatform2.slug,
      otherPlatformName: otherPlatform2.name,
    })
    .from(schema.marketMatches)
    .innerJoin(otherMarket2, eq(schema.marketMatches.marketAId, otherMarket2.id))
    .innerJoin(otherPlatform2, eq(otherMarket2.platformId, otherPlatform2.id))
    .where(eq(schema.marketMatches.marketBId, marketId));

  const formatMatchRow = (r: any) => ({
    matchId: r.matchId,
    confidence: r.confidence,
    matchMethod: r.matchMethod,
    otherMarket: numericFields({
      id: r.otherMarketId,
      platformId: r.otherPlatformId,
      externalId: r.otherExternalId,
      title: r.otherTitle,
      description: r.otherDescription,
      category: r.otherCategory,
      status: r.otherStatus,
      resolutionDate: r.otherResolutionDate,
      resolvedAt: r.otherResolvedAt,
      outcome: r.otherOutcome,
      url: r.otherUrl,
      yesPrice: r.otherYesPrice,
      noPrice: r.otherNoPrice,
      volume24h: r.otherVolume24h,
      liquidity: r.otherLiquidity,
      metadata: r.otherMetadata,
      createdAt: r.otherCreatedAt,
      updatedAt: r.otherUpdatedAt,
      platform: { slug: r.otherPlatformSlug, name: r.otherPlatformName },
    }),
  });

  const matches = [
    ...matchesAsA.map(formatMatchRow),
    ...matchesAsB.map(formatMatchRow),
  ];

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

  const mktA = alias(schema.markets, "mktA");
  const mktB = alias(schema.markets, "mktB");
  const platA = alias(schema.platforms, "platA");
  const platB = alias(schema.platforms, "platB");

  const rows = await db
    .select({
      id: schema.marketMatches.id,
      confidence: schema.marketMatches.confidence,
      matchMethod: schema.marketMatches.matchMethod,
      verified: schema.marketMatches.verified,
      createdAt: schema.marketMatches.createdAt,
      // Market A fields
      aId: mktA.id,
      aPlatformId: mktA.platformId,
      aExternalId: mktA.externalId,
      aTitle: mktA.title,
      aDescription: mktA.description,
      aCategory: mktA.category,
      aStatus: mktA.status,
      aResolutionDate: mktA.resolutionDate,
      aResolvedAt: mktA.resolvedAt,
      aOutcome: mktA.outcome,
      aUrl: mktA.url,
      aYesPrice: mktA.yesPrice,
      aNoPrice: mktA.noPrice,
      aVolume24h: mktA.volume24h,
      aLiquidity: mktA.liquidity,
      aMetadata: mktA.metadata,
      aCreatedAt: mktA.createdAt,
      aUpdatedAt: mktA.updatedAt,
      aPlatformSlug: platA.slug,
      aPlatformName: platA.name,
      // Market B fields
      bId: mktB.id,
      bPlatformId: mktB.platformId,
      bExternalId: mktB.externalId,
      bTitle: mktB.title,
      bDescription: mktB.description,
      bCategory: mktB.category,
      bStatus: mktB.status,
      bResolutionDate: mktB.resolutionDate,
      bResolvedAt: mktB.resolvedAt,
      bOutcome: mktB.outcome,
      bUrl: mktB.url,
      bYesPrice: mktB.yesPrice,
      bNoPrice: mktB.noPrice,
      bVolume24h: mktB.volume24h,
      bLiquidity: mktB.liquidity,
      bMetadata: mktB.metadata,
      bCreatedAt: mktB.createdAt,
      bUpdatedAt: mktB.updatedAt,
      bPlatformSlug: platB.slug,
      bPlatformName: platB.name,
    })
    .from(schema.marketMatches)
    .innerJoin(mktA, eq(schema.marketMatches.marketAId, mktA.id))
    .innerJoin(platA, eq(mktA.platformId, platA.id))
    .innerJoin(mktB, eq(schema.marketMatches.marketBId, mktB.id))
    .innerJoin(platB, eq(mktB.platformId, platB.id))
    .orderBy(desc(schema.marketMatches.confidence))
    .limit(limit)
    .offset(offset);

  const buildMarket = (r: any, prefix: "a" | "b") => ({
    id: r[`${prefix}Id`],
    platformId: r[`${prefix}PlatformId`],
    externalId: r[`${prefix}ExternalId`],
    title: r[`${prefix}Title`],
    description: r[`${prefix}Description`],
    category: r[`${prefix}Category`],
    status: r[`${prefix}Status`],
    resolutionDate: r[`${prefix}ResolutionDate`],
    resolvedAt: r[`${prefix}ResolvedAt`],
    outcome: r[`${prefix}Outcome`],
    url: r[`${prefix}Url`],
    yesPrice: r[`${prefix}YesPrice`],
    noPrice: r[`${prefix}NoPrice`],
    volume24h: r[`${prefix}Volume24h`],
    liquidity: r[`${prefix}Liquidity`],
    metadata: r[`${prefix}Metadata`],
    createdAt: r[`${prefix}CreatedAt`],
    updatedAt: r[`${prefix}UpdatedAt`],
    platform: { slug: r[`${prefix}PlatformSlug`], name: r[`${prefix}PlatformName`] },
  });

  const withSpread = rows.map((r) => {
    const priceA = r.aYesPrice ? Number(r.aYesPrice) : 0;
    const priceB = r.bYesPrice ? Number(r.bYesPrice) : 0;
    const spread = Math.abs(priceA - priceB);

    return {
      id: r.id,
      confidence: r.confidence,
      matchMethod: r.matchMethod,
      verified: r.verified,
      createdAt: r.createdAt,
      spread: Math.round(spread * 10000) / 100,
      marketA: numericFields(buildMarket(r, "a")),
      marketB: numericFields(buildMarket(r, "b")),
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

  const arbMktA = alias(schema.markets, "arbMktA");
  const arbMktB = alias(schema.markets, "arbMktB");
  const arbPlatA = alias(schema.platforms, "arbPlatA");
  const arbPlatB = alias(schema.platforms, "arbPlatB");

  const rows = await db
    .select({
      id: schema.arbOpportunities.id,
      matchId: schema.arbOpportunities.matchId,
      spreadRaw: schema.arbOpportunities.spreadRaw,
      spreadAdjusted: schema.arbOpportunities.spreadAdjusted,
      buyPlatform: schema.arbOpportunities.buyPlatform,
      buyPrice: schema.arbOpportunities.buyPrice,
      sellPrice: schema.arbOpportunities.sellPrice,
      volumeMin: schema.arbOpportunities.volumeMin,
      detectedAt: schema.arbOpportunities.detectedAt,
      closedAt: schema.arbOpportunities.closedAt,
      profitable: schema.arbOpportunities.profitable,
      matchConfidence: schema.marketMatches.confidence,
      // Market A
      aId: arbMktA.id,
      aPlatformId: arbMktA.platformId,
      aExternalId: arbMktA.externalId,
      aTitle: arbMktA.title,
      aDescription: arbMktA.description,
      aCategory: arbMktA.category,
      aStatus: arbMktA.status,
      aResolutionDate: arbMktA.resolutionDate,
      aResolvedAt: arbMktA.resolvedAt,
      aOutcome: arbMktA.outcome,
      aUrl: arbMktA.url,
      aYesPrice: arbMktA.yesPrice,
      aNoPrice: arbMktA.noPrice,
      aVolume24h: arbMktA.volume24h,
      aLiquidity: arbMktA.liquidity,
      aMetadata: arbMktA.metadata,
      aCreatedAt: arbMktA.createdAt,
      aUpdatedAt: arbMktA.updatedAt,
      aPlatformSlug: arbPlatA.slug,
      aPlatformName: arbPlatA.name,
      // Market B
      bId: arbMktB.id,
      bPlatformId: arbMktB.platformId,
      bExternalId: arbMktB.externalId,
      bTitle: arbMktB.title,
      bDescription: arbMktB.description,
      bCategory: arbMktB.category,
      bStatus: arbMktB.status,
      bResolutionDate: arbMktB.resolutionDate,
      bResolvedAt: arbMktB.resolvedAt,
      bOutcome: arbMktB.outcome,
      bUrl: arbMktB.url,
      bYesPrice: arbMktB.yesPrice,
      bNoPrice: arbMktB.noPrice,
      bVolume24h: arbMktB.volume24h,
      bLiquidity: arbMktB.liquidity,
      bMetadata: arbMktB.metadata,
      bCreatedAt: arbMktB.createdAt,
      bUpdatedAt: arbMktB.updatedAt,
      bPlatformSlug: arbPlatB.slug,
      bPlatformName: arbPlatB.name,
    })
    .from(schema.arbOpportunities)
    .innerJoin(schema.marketMatches, eq(schema.arbOpportunities.matchId, schema.marketMatches.id))
    .innerJoin(arbMktA, eq(schema.marketMatches.marketAId, arbMktA.id))
    .innerJoin(arbPlatA, eq(arbMktA.platformId, arbPlatA.id))
    .innerJoin(arbMktB, eq(schema.marketMatches.marketBId, arbMktB.id))
    .innerJoin(arbPlatB, eq(arbMktB.platformId, arbPlatB.id))
    .where(and(...conditions))
    .orderBy(desc(schema.arbOpportunities.spreadAdjusted))
    .limit(limit)
    .offset(offset);

  const buildArbMarket = (r: any, prefix: "a" | "b") => ({
    id: r[`${prefix}Id`],
    platformId: r[`${prefix}PlatformId`],
    externalId: r[`${prefix}ExternalId`],
    title: r[`${prefix}Title`],
    description: r[`${prefix}Description`],
    category: r[`${prefix}Category`],
    status: r[`${prefix}Status`],
    resolutionDate: r[`${prefix}ResolutionDate`],
    resolvedAt: r[`${prefix}ResolvedAt`],
    outcome: r[`${prefix}Outcome`],
    url: r[`${prefix}Url`],
    yesPrice: r[`${prefix}YesPrice`],
    noPrice: r[`${prefix}NoPrice`],
    volume24h: r[`${prefix}Volume24h`],
    liquidity: r[`${prefix}Liquidity`],
    metadata: r[`${prefix}Metadata`],
    createdAt: r[`${prefix}CreatedAt`],
    updatedAt: r[`${prefix}UpdatedAt`],
    platform: { slug: r[`${prefix}PlatformSlug`], name: r[`${prefix}PlatformName`] },
  });

  let results = rows.map((r) => ({
    id: r.id,
    matchId: r.matchId,
    spreadRaw: r.spreadRaw ? Number(r.spreadRaw) : null,
    spreadAdjusted: r.spreadAdjusted ? Number(r.spreadAdjusted) : null,
    buyPlatform: r.buyPlatform,
    buyPrice: r.buyPrice ? Number(r.buyPrice) : null,
    sellPrice: r.sellPrice ? Number(r.sellPrice) : null,
    volumeMin: r.volumeMin ? Number(r.volumeMin) : null,
    detectedAt: r.detectedAt,
    closedAt: r.closedAt,
    profitable: r.profitable,
    marketA: numericFields(buildArbMarket(r, "a")),
    marketB: numericFields(buildArbMarket(r, "b")),
    confidence: r.matchConfidence,
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
  if (platformFilter && platformFilter !== "all") {
    missConditions.push(eq(schema.platforms.slug, platformFilter));
  }

  const notableMisses = await db
    .select({
      id: schema.accuracyRecords.id,
      finalPrice: schema.accuracyRecords.finalPrice,
      outcome: schema.accuracyRecords.outcome,
      brierScore: schema.accuracyRecords.brierScore,
      resolvedAt: schema.accuracyRecords.resolvedAt,
      marketTitle: schema.markets.title,
      marketCategory: schema.markets.category,
      marketOutcome: schema.markets.outcome,
      platformSlug: schema.platforms.slug,
      platformName: schema.platforms.name,
    })
    .from(schema.accuracyRecords)
    .innerJoin(schema.markets, eq(schema.accuracyRecords.marketId, schema.markets.id))
    .innerJoin(schema.platforms, eq(schema.accuracyRecords.platformId, schema.platforms.id))
    .where(and(...missConditions))
    .orderBy(desc(schema.accuracyRecords.brierScore))
    .limit(20);

  return {
    byPlatform,
    byCategory: Array.from(categoryMap.values()),
    notableMisses: notableMisses.map((m) => ({
      id: m.id,
      marketTitle: m.marketTitle,
      category: m.marketCategory,
      platform: m.platformSlug,
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

  const trades = await db
    .select({
      id: schema.whaleTrades.id,
      marketId: schema.whaleTrades.marketId,
      traderAddress: schema.whaleTrades.traderAddress,
      sizeUsd: schema.whaleTrades.sizeUsd,
      side: schema.whaleTrades.side,
      price: schema.whaleTrades.price,
      detectedAt: schema.whaleTrades.detectedAt,
      marketTitle: schema.markets.title,
      marketCategory: schema.markets.category,
      platformSlug: schema.platforms.slug,
      platformName: schema.platforms.name,
    })
    .from(schema.whaleTrades)
    .innerJoin(schema.markets, eq(schema.whaleTrades.marketId, schema.markets.id))
    .innerJoin(schema.platforms, eq(schema.whaleTrades.platformId, schema.platforms.id))
    .orderBy(desc(schema.whaleTrades.sizeUsd))
    .limit(limit)
    .offset(offset);

  const totalResult = await db.select({ count: count() }).from(schema.whaleTrades);

  return {
    trades: trades.map((t) => ({
      id: t.id,
      marketId: t.marketId,
      marketTitle: t.marketTitle,
      marketCategory: t.marketCategory,
      traderAddress: t.traderAddress,
      sizeUsd: Number(t.sizeUsd),
      side: t.side,
      price: t.price ? Number(t.price) : null,
      platform: t.platformSlug,
      platformName: t.platformName,
      detectedAt: t.detectedAt,
    })),
    total: totalResult[0].count,
    limit,
    offset,
  };
}
