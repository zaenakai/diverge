/**
 * API handler — serves dashboard data
 *
 * Deployed as Lambda function URL.
 * Routes:
 *   GET /overview      — dashboard homepage data
 *   GET /markets       — market explorer (search, filter, paginate)
 *   GET /markets/:id   — market detail
 *   GET /matches       — cross-platform matched markets
 *   GET /arbs          — current arb opportunities
 *   GET /accuracy      — accuracy leaderboard
 *   GET /whales        — recent large trades
 *   GET /prices/:id    — price history for a market
 */

export async function handler(event: any) {
  const path = event.rawPath || "/";
  const method = event.requestContext?.http?.method || "GET";

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  try {
    let body: any;

    if (path === "/overview") {
      body = await getOverview();
    } else if (path === "/markets") {
      body = await getMarkets(event.queryStringParameters || {});
    } else if (path.startsWith("/markets/")) {
      const id = path.split("/")[2];
      body = await getMarketDetail(id);
    } else if (path === "/matches") {
      body = await getMatches(event.queryStringParameters || {});
    } else if (path === "/arbs") {
      body = await getArbs(event.queryStringParameters || {});
    } else if (path === "/accuracy") {
      body = await getAccuracy(event.queryStringParameters || {});
    } else if (path === "/whales") {
      body = await getWhales(event.queryStringParameters || {});
    } else if (path.startsWith("/prices/")) {
      const id = path.split("/")[2];
      body = await getPriceHistory(id, event.queryStringParameters || {});
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Not found" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(body),
    };
  } catch (err: any) {
    console.error("API error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

// ── Route Handlers (stubs) ──────────────────────────

async function getOverview() {
  // TODO: aggregate dashboard stats
  return {
    totalMarkets: 0,
    matchedMarkets: 0,
    activeArbs: 0,
    avgSpread: 0,
    totalVolume24h: 0,
    platformVolume: { polymarket: 0, kalshi: 0 },
    topArbs: [],
    trendingMarkets: [],
    recentWhales: [],
  };
}

async function getMarkets(params: Record<string, string>) {
  // TODO: search/filter/paginate markets
  return { markets: [], total: 0, page: 1, pageSize: 50 };
}

async function getMarketDetail(id: string) {
  // TODO: full market detail with price history
  return { market: null };
}

async function getMatches(params: Record<string, string>) {
  // TODO: cross-platform matched markets
  return { matches: [], total: 0 };
}

async function getArbs(params: Record<string, string>) {
  // TODO: current arb opportunities sorted by spread
  return { arbs: [], total: 0 };
}

async function getAccuracy(params: Record<string, string>) {
  // TODO: accuracy leaderboard
  return {
    polymarket: { avgBrierScore: 0, totalMarkets: 0, calibration: [] },
    kalshi: { avgBrierScore: 0, totalMarkets: 0, calibration: [] },
    byCategory: [],
  };
}

async function getWhales(params: Record<string, string>) {
  // TODO: recent large trades
  return { trades: [], total: 0 };
}

async function getPriceHistory(marketId: string, params: Record<string, string>) {
  // TODO: price snapshots over time
  return { prices: [], marketId };
}
