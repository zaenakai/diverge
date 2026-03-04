// ─── Types ───────────────────────────────────────────────────────────────────

export type Platform = "polymarket" | "kalshi";
export type Category = "politics" | "crypto" | "sports" | "economics" | "entertainment" | "science";

export interface Market {
  id: string;
  title: string;
  category: Category;
  platform: Platform;
  yesPrice: number;
  noPrice: number;
  volume24h: number;
  totalVolume: number;
  endDate: string;
  createdAt: string;
  change24h: number; // percentage points
  matchedId?: string; // id of the matched market on other platform
  sparkline: number[]; // 30 data points
}

export interface MatchedMarket {
  id: string;
  title: string;
  category: Category;
  polymarketYes: number;
  kalshiYes: number;
  spread: number;
  polyVolume24h: number;
  kalshiVolume24h: number;
  matchConfidence: number; // 0-1
  priceHistory: { date: string; poly: number; kalshi: number }[];
  spreadHistory: { date: string; spread: number }[];
}

export interface ArbOpportunity {
  id: string;
  title: string;
  category: Category;
  buyPlatform: Platform;
  buyPrice: number;
  sellPlatform: Platform;
  sellPrice: number;
  rawSpread: number;
  adjustedSpread: number; // after fees
  volume: number;
  timeOpen: string; // how long the arb has existed
  trend: "widening" | "narrowing" | "stable";
}

export interface WhaleTrade {
  id: string;
  market: string;
  platform: Platform;
  side: "YES" | "NO";
  amount: number;
  price: number;
  timestamp: string;
  walletAddress?: string;
  pnlHistoric: number; // wallet's historical accuracy %
}

export interface AccuracyData {
  category: Category;
  polyBrier: number;
  kalshiBrier: number;
  sampleSize: number;
}

export interface CalibrationPoint {
  predicted: number;
  actualPoly: number;
  actualKalshi: number;
  sampleSize: number;
}

export interface AccuracyTrend {
  month: string;
  polyBrier: number;
  kalshiBrier: number;
}

export interface NotableMiss {
  market: string;
  platform: Platform;
  predictedProb: number;
  actualOutcome: "YES" | "NO";
  brierContribution: number;
  resolvedDate: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Deterministic PRNG (mulberry32) — prevents SSR/client hydration mismatch
function createRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSparkline(base: number, seed: number, volatility: number = 0.05): number[] {
  const r = createRng(seed);
  const points: number[] = [];
  let current = base;
  for (let i = 0; i < 30; i++) {
    current += (r() - 0.5) * volatility;
    current = Math.max(0.02, Math.min(0.98, current));
    points.push(Math.round(current * 100) / 100);
  }
  return points;
}

function generatePriceHistory(polyBase: number, kalshiBase: number, seed: number) {
  const r = createRng(seed);
  const history: { date: string; poly: number; kalshi: number }[] = [];
  const spreadHistory: { date: string; spread: number }[] = [];
  let poly = polyBase - 0.08;
  let kalshi = kalshiBase - 0.06;
  const now = new Date(2026, 2, 3);
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    poly += (r() - 0.48) * 0.03;
    kalshi += (r() - 0.48) * 0.03;
    poly = Math.max(0.05, Math.min(0.95, poly));
    kalshi = Math.max(0.05, Math.min(0.95, kalshi));
    const dateStr = date.toISOString().split("T")[0];
    history.push({ date: dateStr, poly: Math.round(poly * 100) / 100, kalshi: Math.round(kalshi * 100) / 100 });
    spreadHistory.push({ date: dateStr, spread: Math.round(Math.abs(poly - kalshi) * 10000) / 100 });
  }
  return { history, spreadHistory };
}

// ─── Platform Stats ──────────────────────────────────────────────────────────

export const platformStats = {
  totalMarkets: 2847,
  matchedMarkets: 312,
  activeArbs: 23,
  avgSpread: 3.2,
  totalVolume24h: 14_200_000,
  polymarketVolume24h: 9_800_000,
  kalshiVolume24h: 4_400_000,
  polymarketMarkets: 1832,
  kalshiMarkets: 1015,
  marketsWithSpreadOver2: 47,
};

// ─── Markets ─────────────────────────────────────────────────────────────────

export const markets: Market[] = [
  // Politics
  { id: "pm-1", title: "Will Trump win 2028 Republican Primary?", category: "politics", platform: "polymarket", yesPrice: 0.72, noPrice: 0.28, volume24h: 2_400_000, totalVolume: 45_000_000, endDate: "2028-06-01", createdAt: "2026-01-15", change24h: 2.3, matchedId: "ka-1", sparkline: generateSparkline(0.72, 101) },
  { id: "ka-1", title: "Trump wins 2028 GOP nomination", category: "politics", platform: "kalshi", yesPrice: 0.67, noPrice: 0.33, volume24h: 1_100_000, totalVolume: 18_000_000, endDate: "2028-06-01", createdAt: "2026-01-20", change24h: 1.8, matchedId: "pm-1", sparkline: generateSparkline(0.67, 102) },
  { id: "pm-2", title: "Democrats win 2026 Senate majority?", category: "politics", platform: "polymarket", yesPrice: 0.41, noPrice: 0.59, volume24h: 1_800_000, totalVolume: 32_000_000, endDate: "2026-11-03", createdAt: "2025-11-10", change24h: -1.5, matchedId: "ka-2", sparkline: generateSparkline(0.41, 103) },
  { id: "ka-2", title: "Dems control Senate after 2026 midterms", category: "politics", platform: "kalshi", yesPrice: 0.38, noPrice: 0.62, volume24h: 890_000, totalVolume: 15_000_000, endDate: "2026-11-03", createdAt: "2025-12-01", change24h: -2.1, matchedId: "pm-2", sparkline: generateSparkline(0.38, 104) },
  { id: "pm-3", title: "Will DeSantis run for President in 2028?", category: "politics", platform: "polymarket", yesPrice: 0.55, noPrice: 0.45, volume24h: 650_000, totalVolume: 8_200_000, endDate: "2027-12-31", createdAt: "2026-02-01", change24h: 3.1, matchedId: "ka-3", sparkline: generateSparkline(0.55, 105) },
  { id: "ka-3", title: "DeSantis 2028 presidential campaign", category: "politics", platform: "kalshi", yesPrice: 0.49, noPrice: 0.51, volume24h: 320_000, totalVolume: 4_100_000, endDate: "2027-12-31", createdAt: "2026-02-05", change24h: 2.4, matchedId: "pm-3", sparkline: generateSparkline(0.49, 106) },
  { id: "pm-4", title: "Ukraine ceasefire before July 2026?", category: "politics", platform: "polymarket", yesPrice: 0.23, noPrice: 0.77, volume24h: 1_200_000, totalVolume: 22_000_000, endDate: "2026-07-01", createdAt: "2025-09-15", change24h: -4.2, sparkline: generateSparkline(0.23, 107) },

  // Crypto
  { id: "pm-5", title: "Bitcoin above $150K by Dec 2026?", category: "crypto", platform: "polymarket", yesPrice: 0.34, noPrice: 0.66, volume24h: 3_100_000, totalVolume: 58_000_000, endDate: "2026-12-31", createdAt: "2025-08-01", change24h: 5.2, matchedId: "ka-5", sparkline: generateSparkline(0.34, 108) },
  { id: "ka-5", title: "BTC price exceeds $150,000 by year-end 2026", category: "crypto", platform: "kalshi", yesPrice: 0.41, noPrice: 0.59, volume24h: 1_500_000, totalVolume: 25_000_000, endDate: "2026-12-31", createdAt: "2025-08-10", change24h: 4.8, matchedId: "pm-5", sparkline: generateSparkline(0.41, 109) },
  { id: "pm-6", title: "Ethereum above $8K by Dec 2026?", category: "crypto", platform: "polymarket", yesPrice: 0.22, noPrice: 0.78, volume24h: 980_000, totalVolume: 15_000_000, endDate: "2026-12-31", createdAt: "2026-01-05", change24h: -1.3, matchedId: "ka-6", sparkline: generateSparkline(0.22, 110) },
  { id: "ka-6", title: "ETH above $8,000 end of 2026", category: "crypto", platform: "kalshi", yesPrice: 0.18, noPrice: 0.82, volume24h: 420_000, totalVolume: 6_800_000, endDate: "2026-12-31", createdAt: "2026-01-08", change24h: -0.8, matchedId: "pm-6", sparkline: generateSparkline(0.18, 111) },
  { id: "pm-7", title: "Solana flips Ethereum market cap in 2026?", category: "crypto", platform: "polymarket", yesPrice: 0.08, noPrice: 0.92, volume24h: 450_000, totalVolume: 5_500_000, endDate: "2026-12-31", createdAt: "2026-01-20", change24h: 1.1, sparkline: generateSparkline(0.08, 112) },
  { id: "ka-7", title: "Spot Solana ETF approved by SEC in 2026?", category: "crypto", platform: "kalshi", yesPrice: 0.35, noPrice: 0.65, volume24h: 780_000, totalVolume: 9_200_000, endDate: "2026-12-31", createdAt: "2026-01-25", change24h: 6.4, sparkline: generateSparkline(0.35, 113) },

  // Sports
  { id: "pm-8", title: "Chiefs win Super Bowl LXI?", category: "sports", platform: "polymarket", yesPrice: 0.15, noPrice: 0.85, volume24h: 520_000, totalVolume: 7_800_000, endDate: "2027-02-14", createdAt: "2026-02-15", change24h: 0.5, matchedId: "ka-8", sparkline: generateSparkline(0.15, 114) },
  { id: "ka-8", title: "Kansas City Chiefs Super Bowl LXI champions", category: "sports", platform: "kalshi", yesPrice: 0.13, noPrice: 0.87, volume24h: 310_000, totalVolume: 4_200_000, endDate: "2027-02-14", createdAt: "2026-02-18", change24h: 0.3, matchedId: "pm-8", sparkline: generateSparkline(0.13, 115) },
  { id: "pm-9", title: "Real Madrid wins Champions League 2026?", category: "sports", platform: "polymarket", yesPrice: 0.28, noPrice: 0.72, volume24h: 890_000, totalVolume: 12_000_000, endDate: "2026-06-01", createdAt: "2025-10-01", change24h: -2.1, sparkline: generateSparkline(0.28, 116) },
  { id: "ka-9", title: "Lakers win 2026 NBA Championship", category: "sports", platform: "kalshi", yesPrice: 0.09, noPrice: 0.91, volume24h: 250_000, totalVolume: 3_100_000, endDate: "2026-06-20", createdAt: "2026-01-10", change24h: -0.4, sparkline: generateSparkline(0.09, 117) },

  // Economics
  { id: "pm-10", title: "Fed cuts rates in June 2026?", category: "economics", platform: "polymarket", yesPrice: 0.62, noPrice: 0.38, volume24h: 1_500_000, totalVolume: 28_000_000, endDate: "2026-06-18", createdAt: "2025-12-20", change24h: 3.4, matchedId: "ka-10", sparkline: generateSparkline(0.62, 118) },
  { id: "ka-10", title: "FOMC rate cut June 2026 meeting", category: "economics", platform: "kalshi", yesPrice: 0.55, noPrice: 0.45, volume24h: 920_000, totalVolume: 16_000_000, endDate: "2026-06-18", createdAt: "2025-12-22", change24h: 2.8, matchedId: "pm-10", sparkline: generateSparkline(0.55, 119) },
  { id: "pm-11", title: "US GDP growth above 3% in Q2 2026?", category: "economics", platform: "polymarket", yesPrice: 0.31, noPrice: 0.69, volume24h: 380_000, totalVolume: 4_900_000, endDate: "2026-07-30", createdAt: "2026-01-15", change24h: -1.8, sparkline: generateSparkline(0.31, 120) },
  { id: "ka-11", title: "US recession by end of 2026?", category: "economics", platform: "kalshi", yesPrice: 0.19, noPrice: 0.81, volume24h: 640_000, totalVolume: 11_000_000, endDate: "2026-12-31", createdAt: "2025-11-01", change24h: 0.7, sparkline: generateSparkline(0.19, 121) },
  { id: "pm-12", title: "S&P 500 above 6,500 by June 2026?", category: "economics", platform: "polymarket", yesPrice: 0.45, noPrice: 0.55, volume24h: 720_000, totalVolume: 9_800_000, endDate: "2026-06-30", createdAt: "2026-01-02", change24h: 2.1, matchedId: "ka-12", sparkline: generateSparkline(0.45, 122) },
  { id: "ka-12", title: "S&P 500 closes above 6500 on June 30 2026", category: "economics", platform: "kalshi", yesPrice: 0.42, noPrice: 0.58, volume24h: 510_000, totalVolume: 7_200_000, endDate: "2026-06-30", createdAt: "2026-01-05", change24h: 1.5, matchedId: "pm-12", sparkline: generateSparkline(0.42, 123) },

  // Entertainment / Science
  { id: "pm-13", title: "GPT-5 released before July 2026?", category: "science", platform: "polymarket", yesPrice: 0.68, noPrice: 0.32, volume24h: 1_100_000, totalVolume: 14_000_000, endDate: "2026-07-01", createdAt: "2025-09-01", change24h: -3.2, sparkline: generateSparkline(0.68, 124) },
  { id: "ka-13", title: "AI model scores >90% on ARC-AGI by Dec 2026", category: "science", platform: "kalshi", yesPrice: 0.44, noPrice: 0.56, volume24h: 290_000, totalVolume: 3_800_000, endDate: "2026-12-31", createdAt: "2026-02-01", change24h: 4.5, sparkline: generateSparkline(0.44, 125) },
];

// ─── Matched Markets ─────────────────────────────────────────────────────────

const matchPairs: [string, string, string, Category, number, number, number, number, number][] = [
  ["m1", "Will Trump win 2028 Republican Primary?", "politics", "politics", 0.72, 0.67, 2_400_000, 1_100_000, 0.96],
  ["m2", "Democrats win 2026 Senate majority?", "politics", "politics", 0.41, 0.38, 1_800_000, 890_000, 0.94],
  ["m3", "DeSantis runs for President 2028", "politics", "politics", 0.55, 0.49, 650_000, 320_000, 0.89],
  ["m4", "Bitcoin above $150K by Dec 2026", "crypto", "crypto", 0.34, 0.41, 3_100_000, 1_500_000, 0.98],
  ["m5", "Ethereum above $8K by Dec 2026", "crypto", "crypto", 0.22, 0.18, 980_000, 420_000, 0.95],
  ["m6", "Fed cuts rates June 2026", "economics", "economics", 0.62, 0.55, 1_500_000, 920_000, 0.97],
  ["m7", "S&P 500 above 6,500 June 2026", "economics", "economics", 0.45, 0.42, 720_000, 510_000, 0.92],
  ["m8", "Chiefs win Super Bowl LXI", "sports", "sports", 0.15, 0.13, 520_000, 310_000, 0.99],
];

export const matchedMarkets: MatchedMarket[] = matchPairs.map(([id, title, cat, , polyYes, kalshiYes, polyVol, kalshiVol, confidence]) => {
  const { history, spreadHistory } = generatePriceHistory(polyYes, kalshiYes, 999);
  return {
    id,
    title,
    category: cat as Category,
    polymarketYes: polyYes,
    kalshiYes: kalshiYes,
    spread: Math.round(Math.abs(polyYes - kalshiYes) * 10000) / 100,
    polyVolume24h: polyVol,
    kalshiVolume24h: kalshiVol,
    matchConfidence: confidence,
    priceHistory: history,
    spreadHistory,
  };
});

// ─── Arb Opportunities ──────────────────────────────────────────────────────

export const arbOpportunities: ArbOpportunity[] = [
  { id: "a1", title: "Bitcoin above $150K by Dec 2026?", category: "crypto", buyPlatform: "polymarket", buyPrice: 0.34, sellPlatform: "kalshi", sellPrice: 0.41, rawSpread: 7.0, adjustedSpread: 4.8, volume: 3_100_000, timeOpen: "2h 14m", trend: "widening" },
  { id: "a2", title: "Fed cuts rates June 2026", category: "economics", buyPlatform: "kalshi", buyPrice: 0.55, sellPlatform: "polymarket", sellPrice: 0.62, rawSpread: 7.0, adjustedSpread: 4.6, volume: 1_500_000, timeOpen: "5h 32m", trend: "stable" },
  { id: "a3", title: "DeSantis runs for President 2028", category: "politics", buyPlatform: "kalshi", buyPrice: 0.49, sellPlatform: "polymarket", sellPrice: 0.55, rawSpread: 6.0, adjustedSpread: 3.8, volume: 650_000, timeOpen: "1h 47m", trend: "narrowing" },
  { id: "a4", title: "Trump wins 2028 GOP nomination", category: "politics", buyPlatform: "kalshi", buyPrice: 0.67, sellPlatform: "polymarket", sellPrice: 0.72, rawSpread: 5.0, adjustedSpread: 2.8, volume: 2_400_000, timeOpen: "12h 05m", trend: "stable" },
  { id: "a5", title: "Ethereum above $8K by Dec 2026", category: "crypto", buyPlatform: "kalshi", buyPrice: 0.18, sellPlatform: "polymarket", sellPrice: 0.22, rawSpread: 4.0, adjustedSpread: 1.9, volume: 980_000, timeOpen: "3h 28m", trend: "narrowing" },
  { id: "a6", title: "Democrats win 2026 Senate", category: "politics", buyPlatform: "kalshi", buyPrice: 0.38, sellPlatform: "polymarket", sellPrice: 0.41, rawSpread: 3.0, adjustedSpread: 0.9, volume: 1_800_000, timeOpen: "8h 15m", trend: "narrowing" },
  { id: "a7", title: "S&P 500 above 6,500 June 2026", category: "economics", buyPlatform: "kalshi", buyPrice: 0.42, sellPlatform: "polymarket", sellPrice: 0.45, rawSpread: 3.0, adjustedSpread: 0.8, volume: 720_000, timeOpen: "6h 41m", trend: "stable" },
  { id: "a8", title: "Chiefs win Super Bowl LXI", category: "sports", buyPlatform: "kalshi", buyPrice: 0.13, sellPlatform: "polymarket", sellPrice: 0.15, rawSpread: 2.0, adjustedSpread: 0.1, volume: 520_000, timeOpen: "18h 22m", trend: "stable" },
];

// ─── Arb Historical Performance ──────────────────────────────────────────────

export const arbHistoricalPerformance: { date: string; cumulativeReturn: number; dailyReturn: number }[] = (() => {
  const data: { date: string; cumulativeReturn: number; dailyReturn: number }[] = [];
  const btRng = createRng(777);
  let cumulative = 0;
  const now = new Date(2026, 2, 3);
  for (let i = 89; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const daily = (btRng() * 0.8 - 0.1);
    cumulative += daily;
    data.push({
      date: date.toISOString().split("T")[0],
      cumulativeReturn: Math.round(cumulative * 100) / 100,
      dailyReturn: Math.round(daily * 100) / 100,
    });
  }
  return data;
})();

// ─── Whale Trades ────────────────────────────────────────────────────────────

export const whaleTrades: WhaleTrade[] = [
  { id: "w1", market: "Bitcoin above $150K by Dec 2026?", platform: "polymarket", side: "YES", amount: 125_000, price: 0.34, timestamp: "2026-03-03T22:14:00Z", walletAddress: "0x7a3...f2e1", pnlHistoric: 72 },
  { id: "w2", market: "Fed cuts rates June 2026", platform: "kalshi", side: "YES", amount: 85_000, price: 0.55, timestamp: "2026-03-03T21:48:00Z", pnlHistoric: 68 },
  { id: "w3", market: "Trump wins 2028 GOP nomination", platform: "polymarket", side: "YES", amount: 200_000, price: 0.72, timestamp: "2026-03-03T21:15:00Z", walletAddress: "0x1b2...8c4d", pnlHistoric: 81 },
  { id: "w4", market: "Democrats win 2026 Senate", platform: "polymarket", side: "NO", amount: 150_000, price: 0.59, timestamp: "2026-03-03T20:42:00Z", walletAddress: "0x9e5...3a7b", pnlHistoric: 65 },
  { id: "w5", market: "Ethereum above $8K by Dec 2026", platform: "kalshi", side: "NO", amount: 45_000, price: 0.82, timestamp: "2026-03-03T20:18:00Z", pnlHistoric: 59 },
  { id: "w6", market: "GPT-5 released before July 2026?", platform: "polymarket", side: "YES", amount: 75_000, price: 0.68, timestamp: "2026-03-03T19:55:00Z", walletAddress: "0x4c8...d1f9", pnlHistoric: 74 },
  { id: "w7", market: "S&P 500 above 6,500 June 2026?", platform: "polymarket", side: "YES", amount: 60_000, price: 0.45, timestamp: "2026-03-03T19:30:00Z", walletAddress: "0x2d7...e5a3", pnlHistoric: 77 },
  { id: "w8", market: "Spot Solana ETF approved by SEC", platform: "kalshi", side: "YES", amount: 95_000, price: 0.35, timestamp: "2026-03-03T18:45:00Z", pnlHistoric: 63 },
  { id: "w9", market: "Ukraine ceasefire before July 2026?", platform: "polymarket", side: "NO", amount: 180_000, price: 0.77, timestamp: "2026-03-03T18:12:00Z", walletAddress: "0x6f1...b2c8", pnlHistoric: 85 },
  { id: "w10", market: "US recession by end of 2026?", platform: "kalshi", side: "NO", amount: 110_000, price: 0.81, timestamp: "2026-03-03T17:38:00Z", pnlHistoric: 71 },
  { id: "w11", market: "Real Madrid wins Champions League", platform: "polymarket", side: "YES", amount: 55_000, price: 0.28, timestamp: "2026-03-03T16:55:00Z", walletAddress: "0x3a9...c4e2", pnlHistoric: 58 },
  { id: "w12", market: "Bitcoin above $150K by Dec 2026?", platform: "kalshi", side: "YES", amount: 70_000, price: 0.41, timestamp: "2026-03-03T16:20:00Z", pnlHistoric: 66 },
];

// ─── Accuracy Data ───────────────────────────────────────────────────────────

export const accuracyByCategory: AccuracyData[] = [
  { category: "politics", polyBrier: 0.128, kalshiBrier: 0.145, sampleSize: 342 },
  { category: "crypto", polyBrier: 0.168, kalshiBrier: 0.172, sampleSize: 218 },
  { category: "sports", polyBrier: 0.112, kalshiBrier: 0.108, sampleSize: 456 },
  { category: "economics", polyBrier: 0.155, kalshiBrier: 0.162, sampleSize: 189 },
  { category: "entertainment", polyBrier: 0.142, kalshiBrier: 0.158, sampleSize: 127 },
  { category: "science", polyBrier: 0.135, kalshiBrier: 0.141, sampleSize: 98 },
];

export const overallBrier = {
  polymarket: 0.142,
  kalshi: 0.158,
  polymarketResolved: 1832,
  kalshiResolved: 1015,
};

export const calibrationData: CalibrationPoint[] = [
  { predicted: 0.05, actualPoly: 0.06, actualKalshi: 0.08, sampleSize: 45 },
  { predicted: 0.10, actualPoly: 0.11, actualKalshi: 0.13, sampleSize: 62 },
  { predicted: 0.15, actualPoly: 0.14, actualKalshi: 0.18, sampleSize: 78 },
  { predicted: 0.20, actualPoly: 0.19, actualKalshi: 0.23, sampleSize: 95 },
  { predicted: 0.25, actualPoly: 0.24, actualKalshi: 0.27, sampleSize: 88 },
  { predicted: 0.30, actualPoly: 0.31, actualKalshi: 0.33, sampleSize: 102 },
  { predicted: 0.35, actualPoly: 0.34, actualKalshi: 0.38, sampleSize: 91 },
  { predicted: 0.40, actualPoly: 0.39, actualKalshi: 0.43, sampleSize: 85 },
  { predicted: 0.45, actualPoly: 0.46, actualKalshi: 0.48, sampleSize: 79 },
  { predicted: 0.50, actualPoly: 0.51, actualKalshi: 0.53, sampleSize: 112 },
  { predicted: 0.55, actualPoly: 0.54, actualKalshi: 0.52, sampleSize: 98 },
  { predicted: 0.60, actualPoly: 0.61, actualKalshi: 0.58, sampleSize: 87 },
  { predicted: 0.65, actualPoly: 0.64, actualKalshi: 0.62, sampleSize: 76 },
  { predicted: 0.70, actualPoly: 0.69, actualKalshi: 0.66, sampleSize: 93 },
  { predicted: 0.75, actualPoly: 0.74, actualKalshi: 0.71, sampleSize: 81 },
  { predicted: 0.80, actualPoly: 0.79, actualKalshi: 0.76, sampleSize: 68 },
  { predicted: 0.85, actualPoly: 0.84, actualKalshi: 0.82, sampleSize: 55 },
  { predicted: 0.90, actualPoly: 0.89, actualKalshi: 0.86, sampleSize: 42 },
  { predicted: 0.95, actualPoly: 0.94, actualKalshi: 0.91, sampleSize: 31 },
];

export const accuracyTrend: AccuracyTrend[] = [
  { month: "Oct 2025", polyBrier: 0.162, kalshiBrier: 0.178 },
  { month: "Nov 2025", polyBrier: 0.155, kalshiBrier: 0.171 },
  { month: "Dec 2025", polyBrier: 0.149, kalshiBrier: 0.165 },
  { month: "Jan 2026", polyBrier: 0.145, kalshiBrier: 0.161 },
  { month: "Feb 2026", polyBrier: 0.143, kalshiBrier: 0.159 },
  { month: "Mar 2026", polyBrier: 0.142, kalshiBrier: 0.158 },
];

export const notableMisses: NotableMiss[] = [
  { market: "UK snap election called in Q4 2025", platform: "polymarket", predictedProb: 0.08, actualOutcome: "YES", brierContribution: 0.85, resolvedDate: "2025-10-15" },
  { market: "Bitcoin drops below $50K in 2025", platform: "kalshi", predictedProb: 0.72, actualOutcome: "NO", brierContribution: 0.52, resolvedDate: "2025-12-31" },
  { market: "Fed raises rates in March 2026", platform: "polymarket", predictedProb: 0.04, actualOutcome: "NO", brierContribution: 0.00, resolvedDate: "2026-03-01" },
  { market: "Tesla stock above $400 by Feb 2026", platform: "kalshi", predictedProb: 0.61, actualOutcome: "NO", brierContribution: 0.37, resolvedDate: "2026-02-28" },
  { market: "SpaceX Starship orbital success Q1 2026", platform: "polymarket", predictedProb: 0.82, actualOutcome: "YES", brierContribution: 0.03, resolvedDate: "2026-02-20" },
  { market: "TikTok banned in US by March 2026", platform: "kalshi", predictedProb: 0.45, actualOutcome: "NO", brierContribution: 0.20, resolvedDate: "2026-03-01" },
];

// ─── Trending Markets (biggest movers) ───────────────────────────────────────

export const trendingMarkets = markets
  .filter(m => Math.abs(m.change24h) > 1)
  .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
  .slice(0, 10);

// ─── Biggest Movers (24h) ────────────────────────────────────────────────────

export interface BiggestMover {
  id: string;
  title: string;
  platforms: Platform[];
  spreadChange: number; // positive = spread increased, negative = decreased
  currentSpread: number;
  direction: "up" | "down";
}

export const biggestMovers: BiggestMover[] = [
  { id: "bm1", title: "Bitcoin above $150K by Dec 2026?", platforms: ["polymarket", "kalshi"], spreadChange: 3.2, currentSpread: 7.0, direction: "up" },
  { id: "bm2", title: "Fed cuts rates June 2026", platforms: ["polymarket", "kalshi"], spreadChange: 2.8, currentSpread: 7.0, direction: "up" },
  { id: "bm3", title: "DeSantis runs for President 2028", platforms: ["polymarket", "kalshi"], spreadChange: -1.5, currentSpread: 6.0, direction: "down" },
  { id: "bm4", title: "Ethereum above $8K by Dec 2026", platforms: ["polymarket", "kalshi"], spreadChange: 1.9, currentSpread: 4.0, direction: "up" },
  { id: "bm5", title: "S&P 500 above 6,500 June 2026", platforms: ["polymarket", "kalshi"], spreadChange: -0.8, currentSpread: 3.0, direction: "down" },
  { id: "bm6", title: "Trump wins 2028 GOP nomination", platforms: ["polymarket", "kalshi"], spreadChange: 1.2, currentSpread: 5.0, direction: "up" },
  { id: "bm7", title: "Chiefs win Super Bowl LXI", platforms: ["polymarket", "kalshi"], spreadChange: 0.5, currentSpread: 2.0, direction: "up" },
  { id: "bm8", title: "Democrats win 2026 Senate", platforms: ["polymarket", "kalshi"], spreadChange: -2.1, currentSpread: 3.0, direction: "down" },
];

// ─── Arb Alerts ──────────────────────────────────────────────────────────────

export interface ArbAlert {
  id: string;
  timestamp: string;
  market: string;
  spread: number;
  platforms: [Platform, Platform];
}

export const arbAlerts: ArbAlert[] = [
  { id: "al1", timestamp: "2026-03-03T22:58:00Z", market: "Bitcoin above $150K by Dec 2026?", spread: 7.0, platforms: ["polymarket", "kalshi"] },
  { id: "al2", timestamp: "2026-03-03T22:41:00Z", market: "Fed cuts rates June 2026", spread: 7.0, platforms: ["polymarket", "kalshi"] },
  { id: "al3", timestamp: "2026-03-03T22:15:00Z", market: "DeSantis runs for President 2028", spread: 6.0, platforms: ["polymarket", "kalshi"] },
  { id: "al4", timestamp: "2026-03-03T21:52:00Z", market: "Ethereum above $8K by Dec 2026", spread: 4.0, platforms: ["polymarket", "kalshi"] },
  { id: "al5", timestamp: "2026-03-03T21:30:00Z", market: "Trump wins 2028 GOP nomination", spread: 5.0, platforms: ["polymarket", "kalshi"] },
  { id: "al6", timestamp: "2026-03-03T20:48:00Z", market: "Democrats win 2026 Senate", spread: 3.0, platforms: ["polymarket", "kalshi"] },
  { id: "al7", timestamp: "2026-03-03T20:05:00Z", market: "S&P 500 above 6,500 June 2026", spread: 3.0, platforms: ["polymarket", "kalshi"] },
  { id: "al8", timestamp: "2026-03-03T19:22:00Z", market: "Chiefs win Super Bowl LXI", spread: 2.0, platforms: ["polymarket", "kalshi"] },
];

// ─── Helper Utils ────────────────────────────────────────────────────────────

export function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function formatPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

export function timeAgo(timestamp: string): string {
  const now = new Date("2026-03-03T23:00:00Z");
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export const categoryColors: Record<Category, string> = {
  politics: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  crypto: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  sports: "bg-green-500/20 text-green-400 border-green-500/30",
  economics: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  entertainment: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  science: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

// ─── Explorer Markets (unified view for Markets page) ────────────────────────

export interface ExplorerMarket {
  id: string;
  title: string;
  category: Category;
  matched: boolean;
  // Cross-platform fields (matched markets only)
  polymarketPrice?: number;
  kalshiPrice?: number;
  spread?: number;
  polyVolume24h?: number;
  kalshiVolume24h?: number;
  // Single-platform fields
  platform?: Platform;
  yesPrice?: number;
  change24h: number;
  volume24h: number;
  totalVolume: number;
  endDate: string;
}

export const explorerMarkets: ExplorerMarket[] = [
  // ── Matched / Cross-Platform Markets (8) ──
  {
    id: "m1",
    title: "Will Trump win 2028 Republican Primary?",
    category: "politics",
    matched: true,
    polymarketPrice: 0.72,
    kalshiPrice: 0.67,
    spread: 5.0,
    polyVolume24h: 2_400_000,
    kalshiVolume24h: 1_100_000,
    change24h: 2.3,
    volume24h: 3_500_000,
    totalVolume: 63_000_000,
    endDate: "2028-06-01",
  },
  {
    id: "m2",
    title: "Democrats win 2026 Senate majority?",
    category: "politics",
    matched: true,
    polymarketPrice: 0.41,
    kalshiPrice: 0.38,
    spread: 3.0,
    polyVolume24h: 1_800_000,
    kalshiVolume24h: 890_000,
    change24h: -1.5,
    volume24h: 2_690_000,
    totalVolume: 47_000_000,
    endDate: "2026-11-03",
  },
  {
    id: "m3",
    title: "DeSantis runs for President 2028",
    category: "politics",
    matched: true,
    polymarketPrice: 0.55,
    kalshiPrice: 0.49,
    spread: 6.0,
    polyVolume24h: 650_000,
    kalshiVolume24h: 320_000,
    change24h: 3.1,
    volume24h: 970_000,
    totalVolume: 12_300_000,
    endDate: "2027-12-31",
  },
  {
    id: "m4",
    title: "Bitcoin above $150K by Dec 2026?",
    category: "crypto",
    matched: true,
    polymarketPrice: 0.34,
    kalshiPrice: 0.41,
    spread: 7.0,
    polyVolume24h: 3_100_000,
    kalshiVolume24h: 1_500_000,
    change24h: 5.2,
    volume24h: 4_600_000,
    totalVolume: 83_000_000,
    endDate: "2026-12-31",
  },
  {
    id: "m5",
    title: "Ethereum above $8K by Dec 2026?",
    category: "crypto",
    matched: true,
    polymarketPrice: 0.22,
    kalshiPrice: 0.18,
    spread: 4.0,
    polyVolume24h: 980_000,
    kalshiVolume24h: 420_000,
    change24h: -1.3,
    volume24h: 1_400_000,
    totalVolume: 21_800_000,
    endDate: "2026-12-31",
  },
  {
    id: "m6",
    title: "Fed cuts rates June 2026",
    category: "economics",
    matched: true,
    polymarketPrice: 0.62,
    kalshiPrice: 0.55,
    spread: 7.0,
    polyVolume24h: 1_500_000,
    kalshiVolume24h: 920_000,
    change24h: 3.4,
    volume24h: 2_420_000,
    totalVolume: 44_000_000,
    endDate: "2026-06-18",
  },
  {
    id: "m7",
    title: "S&P 500 above 6,500 by June 2026?",
    category: "economics",
    matched: true,
    polymarketPrice: 0.45,
    kalshiPrice: 0.42,
    spread: 3.0,
    polyVolume24h: 720_000,
    kalshiVolume24h: 510_000,
    change24h: 2.1,
    volume24h: 1_230_000,
    totalVolume: 17_000_000,
    endDate: "2026-06-30",
  },
  {
    id: "m8",
    title: "Chiefs win Super Bowl LXI?",
    category: "sports",
    matched: true,
    polymarketPrice: 0.15,
    kalshiPrice: 0.13,
    spread: 2.0,
    polyVolume24h: 520_000,
    kalshiVolume24h: 310_000,
    change24h: 0.5,
    volume24h: 830_000,
    totalVolume: 12_000_000,
    endDate: "2027-02-14",
  },
  // ── Single-Platform Markets (8) ──
  {
    id: "s1",
    title: "Ukraine ceasefire before July 2026?",
    category: "politics",
    matched: false,
    platform: "polymarket",
    yesPrice: 0.23,
    change24h: -4.2,
    volume24h: 1_200_000,
    totalVolume: 22_000_000,
    endDate: "2026-07-01",
  },
  {
    id: "s2",
    title: "Solana flips Ethereum market cap in 2026?",
    category: "crypto",
    matched: false,
    platform: "polymarket",
    yesPrice: 0.08,
    change24h: 1.1,
    volume24h: 450_000,
    totalVolume: 5_500_000,
    endDate: "2026-12-31",
  },
  {
    id: "s3",
    title: "Spot Solana ETF approved by SEC in 2026?",
    category: "crypto",
    matched: false,
    platform: "kalshi",
    yesPrice: 0.35,
    change24h: 6.4,
    volume24h: 780_000,
    totalVolume: 9_200_000,
    endDate: "2026-12-31",
  },
  {
    id: "s4",
    title: "Real Madrid wins Champions League 2026?",
    category: "sports",
    matched: false,
    platform: "polymarket",
    yesPrice: 0.28,
    change24h: -2.1,
    volume24h: 890_000,
    totalVolume: 12_000_000,
    endDate: "2026-06-01",
  },
  {
    id: "s5",
    title: "Lakers win 2026 NBA Championship",
    category: "sports",
    matched: false,
    platform: "kalshi",
    yesPrice: 0.09,
    change24h: -0.4,
    volume24h: 250_000,
    totalVolume: 3_100_000,
    endDate: "2026-06-20",
  },
  {
    id: "s6",
    title: "US GDP growth above 3% in Q2 2026?",
    category: "economics",
    matched: false,
    platform: "polymarket",
    yesPrice: 0.31,
    change24h: -1.8,
    volume24h: 380_000,
    totalVolume: 4_900_000,
    endDate: "2026-07-30",
  },
  {
    id: "s7",
    title: "US recession by end of 2026?",
    category: "economics",
    matched: false,
    platform: "kalshi",
    yesPrice: 0.19,
    change24h: 0.7,
    volume24h: 640_000,
    totalVolume: 11_000_000,
    endDate: "2026-12-31",
  },
  {
    id: "s8",
    title: "GPT-5 released before July 2026?",
    category: "science",
    matched: false,
    platform: "polymarket",
    yesPrice: 0.68,
    change24h: -3.2,
    volume24h: 1_100_000,
    totalVolume: 14_000_000,
    endDate: "2026-07-01",
  },
];
