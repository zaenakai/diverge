/**
 * API client for Diverge backend
 *
 * Uses NEXT_PUBLIC_API_URL env var (set by SST from the Lambda function URL).
 * Falls back gracefully so the frontend can still render with mock data.
 */

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
  return apiFetch<MarketsResponse>("/markets", opts);
}

export async function getMarketDetail(id: number | string): Promise<MarketDetailResponse> {
  return apiFetch<MarketDetailResponse>(`/markets/${id}`);
}

export async function getMatches(opts?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<MatchesResponse> {
  return apiFetch<MatchesResponse>("/matches", opts);
}

export async function getArbs(opts?: {
  min_spread?: number;
  category?: string;
  direction?: string;
  limit?: number;
  offset?: number;
}): Promise<ArbsResponse> {
  return apiFetch<ArbsResponse>("/arbs", opts);
}

export async function getAccuracy(opts?: {
  platform?: string;
}): Promise<AccuracyResponse> {
  return apiFetch<AccuracyResponse>("/accuracy", opts);
}

export async function getCalibration(): Promise<CalibrationResponse> {
  return apiFetch<CalibrationResponse>("/accuracy/calibration");
}

export async function getWhales(opts?: {
  limit?: number;
  offset?: number;
}): Promise<WhalesResponse> {
  return apiFetch<WhalesResponse>("/whales", opts);
}

export async function getStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>("/stats");
}
