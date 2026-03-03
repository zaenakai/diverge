/**
 * Market Matcher — runs every 30 minutes
 *
 * Finds cross-platform matches between Polymarket and Kalshi markets.
 * Uses structured + fuzzy matching from core/matching.ts.
 */

import { findMatches } from "@diverge/core/matching.js";
import type { Market } from "@diverge/core/types.js";

export async function handler() {
  console.log("[MarketMatcher] Starting cross-platform matching...");

  // TODO: Fetch all unmatched active markets from both platforms
  // const polymarketMarkets: Market[] = await db.getUnmatchedMarkets("polymarket");
  // const kalshiMarkets: Market[] = await db.getUnmatchedMarkets("kalshi");

  // const matches = findMatches(polymarketMarkets, kalshiMarkets, 0.6);

  // for (const match of matches) {
  //   await db.upsertMatch({
  //     marketAId: match.marketA.id,
  //     marketBId: match.marketB.id,
  //     confidence: match.confidence,
  //     matchMethod: match.method,
  //     verified: false,
  //   });
  // }

  // console.log(`[MarketMatcher] Found ${matches.length} new matches`);
  console.log("[MarketMatcher] Done.");
  return { status: "ok" };
}
