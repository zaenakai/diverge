// ── Platform Types ────────────────────────────────────

export type Platform = "polymarket" | "kalshi";

export type MarketStatus = "active" | "resolved" | "cancelled" | "closed";

export type MatchMethod = "auto_structured" | "auto_fuzzy" | "manual";

// ── Market ───────────────────────────────────────────

export interface Market {
  id: number;
  platform: Platform;
  externalId: string;
  title: string;
  description?: string;
  category?: string;
  status: MarketStatus;
  resolutionDate?: Date;
  resolvedAt?: Date;
  outcome?: "yes" | "no";
  url?: string;
  yesPrice?: number;
  noPrice?: number;
  volume24h?: number;
  liquidity?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Market Match (cross-platform) ────────────────────

export interface MarketMatch {
  id: number;
  marketA: Market; // typically Polymarket
  marketB: Market; // typically Kalshi
  confidence: number; // 0.0 to 1.0
  matchMethod: MatchMethod;
  verified: boolean;
  spread?: number; // current price difference
  createdAt: Date;
}

// ── Price Snapshot ───────────────────────────────────

export interface PriceSnapshot {
  id: number;
  marketId: number;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  liquidity: number;
  recordedAt: Date;
}

// ── Arb Opportunity ─────────────────────────────────

export interface ArbOpportunity {
  id: number;
  matchId: number;
  match?: MarketMatch;
  spreadRaw: number;
  spreadAdjusted: number; // after fees + estimated slippage
  buyPlatform: Platform;
  buyPrice: number;
  sellPrice: number;
  volumeMin: number;
  detectedAt: Date;
  closedAt?: Date;
  profitable?: boolean;
}

// ── Accuracy Record ─────────────────────────────────

export interface AccuracyRecord {
  id: number;
  marketId: number;
  platform: Platform;
  category?: string;
  finalPrice: number; // last price before resolution
  outcome: number; // 1 = yes, 0 = no
  brierScore: number; // (forecast - outcome)^2
  resolvedAt: Date;
}

// ── Accuracy Summary ────────────────────────────────

export interface AccuracySummary {
  platform: Platform;
  category?: string;
  avgBrierScore: number;
  totalMarkets: number;
  calibration: CalibrationPoint[];
}

export interface CalibrationPoint {
  bucket: number; // e.g., 0.1, 0.2, ..., 0.9
  avgForecast: number;
  avgOutcome: number;
  count: number;
}

// ── Whale Trade ─────────────────────────────────────

export interface WhaleTrade {
  id: number;
  marketId: number;
  market?: Market;
  traderAddress: string;
  sizeUsd: number;
  side: "yes" | "no";
  price: number;
  platform: Platform;
  detectedAt: Date;
}

// ── API Response Types ──────────────────────────────

export interface DashboardOverview {
  totalMarkets: number;
  matchedMarkets: number;
  activeArbs: number;
  avgSpread: number;
  totalVolume24h: number;
  platformVolume: Record<Platform, number>;
  topArbs: ArbOpportunity[];
  trendingMarkets: Market[];
  recentWhales: WhaleTrade[];
}

export interface PlatformAccuracy {
  polymarket: AccuracySummary;
  kalshi: AccuracySummary;
  byCategory: {
    category: string;
    polymarket: AccuracySummary;
    kalshi: AccuracySummary;
    winner: Platform;
  }[];
}
