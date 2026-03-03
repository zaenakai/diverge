/**
 * Polymarket API client
 *
 * Data sources:
 * - Gamma Markets API: https://gamma-api.polymarket.com
 * - CLOB API: https://clob.polymarket.com
 *
 * No auth needed for read operations.
 */

const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";

export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  markets: PolymarketMarket[];
}

export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  resolutionSource: string;
  endDate: string;
  liquidity: string;
  volume: string;
  volume24hr: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  outcomePrices: string; // JSON string: "[\"0.65\", \"0.35\"]"
  clobTokenIds: string; // JSON string of token IDs for CLOB
  acceptingOrders: boolean;
}

export interface PolymarketOrderBook {
  market: string;
  asset_id: string;
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
}

export async function fetchMarkets(
  params: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
  } = {}
): Promise<PolymarketMarket[]> {
  const url = new URL(`${GAMMA_API}/markets`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.offset) url.searchParams.set("offset", String(params.offset));
  if (params.active !== undefined) url.searchParams.set("active", String(params.active));
  if (params.closed !== undefined) url.searchParams.set("closed", String(params.closed));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Polymarket markets API error: ${res.status}`);
  return res.json();
}

export async function fetchEvents(
  params: { limit?: number; offset?: number; slug?: string } = {}
): Promise<PolymarketEvent[]> {
  const url = new URL(`${GAMMA_API}/events`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.offset) url.searchParams.set("offset", String(params.offset));
  if (params.slug) url.searchParams.set("slug", params.slug);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Polymarket events API error: ${res.status}`);
  return res.json();
}

export async function fetchOrderBook(tokenId: string): Promise<PolymarketOrderBook> {
  const url = `${CLOB_API}/book?token_id=${tokenId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polymarket CLOB orderbook error: ${res.status}`);
  return res.json();
}

export function parsePrices(market: PolymarketMarket): { yes: number; no: number } {
  try {
    const prices = JSON.parse(market.outcomePrices);
    return {
      yes: parseFloat(prices[0]) || 0,
      no: parseFloat(prices[1]) || 0,
    };
  } catch {
    return { yes: 0, no: 0 };
  }
}

export function parseTokenIds(market: PolymarketMarket): string[] {
  try {
    return JSON.parse(market.clobTokenIds);
  } catch {
    return [];
  }
}
