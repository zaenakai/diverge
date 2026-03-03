/**
 * Kalshi API client
 *
 * Public endpoints (no auth needed):
 * - GET /trade-api/v2/events
 * - GET /trade-api/v2/markets
 * - GET /trade-api/v2/markets/:ticker/orderbook
 *
 * Docs: https://docs.kalshi.com
 */

const KALSHI_API = "https://api.elections.kalshi.com/trade-api/v2";

export interface KalshiEvent {
  event_ticker: string;
  series_ticker: string;
  title: string;
  category: string;
  sub_title: string;
  mutually_exclusive: boolean;
  markets: KalshiMarket[];
}

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  title: string;
  subtitle: string;
  status: "active" | "closed" | "settled";
  close_time: string;
  expiration_time: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  liquidity: number;
  result?: "yes" | "no" | "all_no" | "all_yes";
  category: string;
  rules_primary: string;
  settlement_source_url?: string;
}

export interface KalshiOrderBook {
  orderbook: {
    yes: [number, number][]; // [price, quantity]
    no: [number, number][];
  };
}

export async function fetchEvents(
  params: {
    limit?: number;
    cursor?: string;
    status?: "open" | "closed" | "settled";
    series_ticker?: string;
    with_nested_markets?: boolean;
  } = {}
): Promise<{ events: KalshiEvent[]; cursor: string }> {
  const url = new URL(`${KALSHI_API}/events`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.series_ticker) url.searchParams.set("series_ticker", params.series_ticker);
  if (params.with_nested_markets) url.searchParams.set("with_nested_markets", "true");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Kalshi events API error: ${res.status}`);
  return res.json();
}

export async function fetchMarkets(
  params: {
    limit?: number;
    cursor?: string;
    event_ticker?: string;
    status?: "open" | "closed" | "settled";
    series_ticker?: string;
    tickers?: string;
  } = {}
): Promise<{ markets: KalshiMarket[]; cursor: string }> {
  const url = new URL(`${KALSHI_API}/markets`);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.event_ticker) url.searchParams.set("event_ticker", params.event_ticker);
  if (params.status) url.searchParams.set("status", params.status);
  if (params.series_ticker) url.searchParams.set("series_ticker", params.series_ticker);
  if (params.tickers) url.searchParams.set("tickers", params.tickers);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Kalshi markets API error: ${res.status}`);
  return res.json();
}

export async function fetchOrderBook(ticker: string): Promise<KalshiOrderBook> {
  const url = `${KALSHI_API}/markets/${ticker}/orderbook`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kalshi orderbook API error: ${res.status}`);
  return res.json();
}

export function getMidPrice(market: KalshiMarket): { yes: number; no: number } {
  return {
    yes: (market.yes_bid + market.yes_ask) / 2 / 100, // Kalshi uses cents
    no: (market.no_bid + market.no_ask) / 2 / 100,
  };
}
