/**
 * API client for Diverge backend
 *
 * Uses NEXT_PUBLIC_API_URL env var (set by SST from the Lambda function URL).
 * Falls back gracefully so the frontend can still render with mock data.
 */

import { toNumber } from "./format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ────────────────────────────────────────────

export interface PlatformInfo {
  slug: string;
  name: string;
}

export interface ApiMarket {
  id: number;
  platformId: number;
  externalId: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  resolutionDate: string | null;
  resolvedAt: string | null;
  outcome: string | null;
  url: string | null;
  yesPrice: number | null;
  noPrice: number | null;
  volume24h: number | null;
  liquidity: number | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  platform: PlatformInfo;
}

export interface MarketsResponse {
  markets: ApiMarket[];
  total: number;
  limit: number;
  offset: number;
}

export interface PricePoint {
  yesPrice: number | null;
  noPrice: number | null;
  volume24h: number | null;
  liquidity: number | null;
  recordedAt: string;
}

export interface MarketMatch {
  matchId: number;
  confidence: number;
  matchMethod: string;
  otherMarket: ApiMarket;
}

export interface MarketDetailResponse {
  market: ApiMarket;
  matches: MarketMatch[];
  priceHistory: PricePoint[];
  error?: string;
}

export interface MatchedMarketPair {
  id: number;
  confidence: number;
  matchMethod: string;
  verified: boolean;
  createdAt: string;
  spread: number; // percentage points
  marketA: ApiMarket;
  marketB: ApiMarket;
}

export interface MatchesResponse {
  matches: MatchedMarketPair[];
  total: number;
  limit: number;
  offset: number;
}

export interface ArbResult {
  id: number;
  matchId: number;
  spreadRaw: number | null;
  spreadAdjusted: number | null;
  buyPlatform: string;
  buyPrice: number | null;
  sellPrice: number | null;
  volumeMin: number | null;
  detectedAt: string;
  closedAt: string | null;
  profitable: boolean | null;
  marketA: ApiMarket;
  marketB: ApiMarket;
  confidence: number;
}

export interface ArbsResponse {
  arbs: ArbResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface PlatformAccuracy {
  platformId: number;
  slug: string;
  name: string;
  avgBrierScore: number | null;
  totalResolved: number;
}

export interface CategoryAccuracy {
  category: string;
  platforms: Record<string, { avg: number; count: number }>;
}

export interface NotableMiss {
  id: number;
  marketTitle: string;
  category: string | null;
  platform: string;
  finalPrice: number | null;
  outcome: number | null;
  brierScore: number | null;
  resolvedAt: string | null;
}

export interface AccuracyResponse {
  byPlatform: PlatformAccuracy[];
  byCategory: CategoryAccuracy[];
  notableMisses: NotableMiss[];
}

export interface CalibrationBucket {
  predicted: number;
  platforms: Record<string, { actual: number; sampleSize: number }>;
}

export interface CalibrationResponse {
  buckets: CalibrationBucket[];
}

export interface WhaleTradeResult {
  id: number;
  marketId: number;
  marketTitle: string;
  marketCategory: string | null;
  marketUrl: string | null;
  traderAddress: string | null;
  sizeUsd: number;
  side: string;
  price: number | null;
  platform: string;
  platformName: string;
  detectedAt: string;
}

export interface WhalesResponse {
  trades: WhaleTradeResult[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatsResponse {
  totalMarkets: number;
  polymarketMarkets: number;
  kalshiMarkets: number;
  totalMatched: number;
  activeArbs: number;
  avgBrierScore: number | null;
  totalVolume24h: number;
}

// ── Decimal normalization ────────────────────────────
// The API returns Prisma Decimal fields as objects like { s:1, e:-1, d:[9995000] }.
// We normalize these to plain numbers at the API layer so pages don't have to worry.

function normalizeMarket(m: any): ApiMarket {
  return {
    ...m,
    yesPrice: toNumber(m.yesPrice),
    noPrice: toNumber(m.noPrice),
    volume24h: toNumber(m.volume24h),
    liquidity: toNumber(m.liquidity),
    resolutionDate: m.resolutionDate && typeof m.resolutionDate === 'object' && !('s' in m.resolutionDate)
      ? null  // empty {} from API
      : m.resolutionDate,
    createdAt: typeof m.createdAt === 'object' ? '' : m.createdAt,
    updatedAt: typeof m.updatedAt === 'object' ? '' : m.updatedAt,
  };
}

function normalizeMatch(m: any): MatchedMarketPair {
  return {
    ...m,
    confidence: toNumber(m.confidence),
    spread: toNumber(m.spread),
    marketA: normalizeMarket(m.marketA),
    marketB: normalizeMarket(m.marketB),
  };
}

function normalizeArb(a: any): ArbResult {
  return {
    ...a,
    spreadRaw: toNumber(a.spreadRaw),
    spreadAdjusted: toNumber(a.spreadAdjusted),
    buyPrice: toNumber(a.buyPrice),
    sellPrice: toNumber(a.sellPrice),
    volumeMin: toNumber(a.volumeMin),
    confidence: toNumber(a.confidence),
    marketA: normalizeMarket(a.marketA),
    marketB: normalizeMarket(a.marketB),
  };
}

function normalizeWhaleTrade(t: any): WhaleTradeResult {
  return {
    ...t,
    sizeUsd: toNumber(t.sizeUsd),
    price: toNumber(t.price),
  };
}

function normalizeStats(s: any): StatsResponse {
  return {
    totalMarkets: toNumber(s.totalMarkets),
    polymarketMarkets: toNumber(s.polymarketMarkets),
    kalshiMarkets: toNumber(s.kalshiMarkets),
    totalMatched: toNumber(s.totalMatched),
    activeArbs: toNumber(s.activeArbs),
    avgBrierScore: s.avgBrierScore != null ? toNumber(s.avgBrierScore) : null,
    totalVolume24h: toNumber(s.totalVolume24h),
  };
}

function normalizePricePoint(p: any): PricePoint {
  return {
    yesPrice: toNumber(p.yesPrice),
    noPrice: toNumber(p.noPrice),
    volume24h: toNumber(p.volume24h),
    liquidity: toNumber(p.liquidity),
    recordedAt: typeof p.recordedAt === 'object' ? '' : p.recordedAt,
  };
}

// ── Fetch wrapper ────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, "API_URL not configured");
  }

  const url = new URL(path, API_URL);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
    // Cache for 30s on server-side, revalidate in background
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Public API functions ─────────────────────────────

export async function getMarkets(opts?: {
  platform?: string;
  category?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<MarketsResponse> {
  const raw = await apiFetch<any>("/markets", opts);
  return {
    ...raw,
    markets: (raw.markets ?? []).map(normalizeMarket),
  };
}

export async function getMarketDetail(id: number | string): Promise<MarketDetailResponse> {
  const raw = await apiFetch<any>(`/markets/${id}`);
  return {
    ...raw,
    market: normalizeMarket(raw.market),
    matches: (raw.matches ?? []).map((m: any) => ({
      ...m,
      confidence: toNumber(m.confidence),
      otherMarket: normalizeMarket(m.otherMarket),
    })),
    priceHistory: (raw.priceHistory ?? []).map(normalizePricePoint),
  };
}

export async function getMatches(opts?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<MatchesResponse> {
  const raw = await apiFetch<any>("/matches", opts);
  return {
    ...raw,
    matches: (raw.matches ?? []).map(normalizeMatch),
  };
}

export async function getArbs(opts?: {
  min_spread?: number;
  category?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}): Promise<ArbsResponse> {
  const raw = await apiFetch<any>("/arbs", opts);
  return {
    ...raw,
    arbs: (raw.arbs ?? []).map(normalizeArb),
  };
}

export async function getAccuracy(opts?: {
  platform?: string;
}): Promise<AccuracyResponse> {
  const raw = await apiFetch<any>("/accuracy", opts);
  return {
    byPlatform: (raw.byPlatform ?? []).map((p: any) => ({
      ...p,
      avgBrierScore: p.avgBrierScore != null ? toNumber(p.avgBrierScore) : null,
      totalResolved: toNumber(p.totalResolved),
    })),
    byCategory: raw.byCategory ?? [],
    notableMisses: (raw.notableMisses ?? []).map((m: any) => ({
      ...m,
      finalPrice: m.finalPrice != null ? toNumber(m.finalPrice) : null,
      outcome: m.outcome != null ? toNumber(m.outcome) : null,
      brierScore: m.brierScore != null ? toNumber(m.brierScore) : null,
    })),
  };
}

export async function getCalibration(): Promise<CalibrationResponse> {
  const raw = await apiFetch<any>("/accuracy/calibration");
  return {
    buckets: (raw.buckets ?? []).map((b: any) => ({
      predicted: toNumber(b.predicted),
      platforms: Object.fromEntries(
        Object.entries(b.platforms ?? {}).map(([k, v]: [string, any]) => [
          k,
          { actual: toNumber(v.actual), sampleSize: toNumber(v.sampleSize) },
        ])
      ),
    })),
  };
}

export async function getWhales(opts?: {
  limit?: number;
  offset?: number;
}): Promise<WhalesResponse> {
  const raw = await apiFetch<any>("/whales", opts);
  return {
    ...raw,
    trades: (raw.trades ?? []).map(normalizeWhaleTrade),
  };
}

export async function getStats(): Promise<StatsResponse> {
  const raw = await apiFetch<any>("/stats");
  return normalizeStats(raw);
}
