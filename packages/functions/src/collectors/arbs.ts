/**
 * Arb Detector — runs every 2 minutes
 *
 * For each matched market pair, calculates the price spread.
 * If spread > threshold after fees, records an arb opportunity.
 */

import { db, schema } from "../../../core/src/db/index.js";
import { eq, and, isNull } from "drizzle-orm";

// Platform fee estimates (conservative)
const FEES: Record<string, number> = {
  polymarket: 0.02,
  kalshi: 0.05,
};

const MIN_ADJUSTED_SPREAD = 0.01;

interface ArbCalc {
  matchId: number;
  spreadRaw: number;
  spreadAdjusted: number;
  buyPlatform: string;
  buyPrice: number;
  sellPrice: number;
}

function calculateArb(
  matchId: number,
  polyPrice: number,
  kalshiPrice: number
): ArbCalc | null {
  const spreads = [
    {
      buyPlatform: "polymarket",
      sellPlatform: "kalshi",
      buyPrice: polyPrice,
      sellPrice: kalshiPrice,
      raw: kalshiPrice - polyPrice,
    },
    {
      buyPlatform: "kalshi",
      sellPlatform: "polymarket",
      buyPrice: kalshiPrice,
      sellPrice: polyPrice,
      raw: polyPrice - kalshiPrice,
    },
  ];

  for (const s of spreads) {
    if (s.raw <= 0) continue;

    const buyFee = (FEES[s.buyPlatform] ?? 0) * (1 - s.buyPrice);
    const sellFee = (FEES[s.sellPlatform] ?? 0) * (1 - s.sellPrice);
    const adjustedSpread = s.raw - buyFee - sellFee;

    if (adjustedSpread > MIN_ADJUSTED_SPREAD) {
      return {
        matchId,
        spreadRaw: s.raw,
        spreadAdjusted: adjustedSpread,
        buyPlatform: s.buyPlatform,
        buyPrice: s.buyPrice,
        sellPrice: s.sellPrice,
      };
    }
  }

  return null;
}

export async function handler() {
  console.log("[ArbDetector] Scanning for arbitrage opportunities...");

  // Fetch all active matched markets with prices
  const matches = await db.query.marketMatches.findMany({
    with: {
      marketA: { with: { platform: true } },
      marketB: { with: { platform: true } },
    },
  });

  // Filter to only active market pairs
  const activeMatches = matches.filter(
    (m) => m.marketA.status === "active" && m.marketB.status === "active"
  );

  let arbCount = 0;
  const now = new Date();

  for (const match of activeMatches) {
    const priceA = match.marketA.yesPrice ? Number(match.marketA.yesPrice) : null;
    const priceB = match.marketB.yesPrice ? Number(match.marketB.yesPrice) : null;

    if (priceA === null || priceB === null) continue;

    const polyPrice = match.marketA.platform.slug === "polymarket" ? priceA : priceB;
    const kalshiPrice = match.marketA.platform.slug === "kalshi" ? priceA : priceB;

    const arb = calculateArb(match.id, polyPrice, kalshiPrice);

    if (arb) {
      // Close any previous open arbs for this match
      await db
        .update(schema.arbOpportunities)
        .set({ closedAt: now })
        .where(
          and(
            eq(schema.arbOpportunities.matchId, match.id),
            isNull(schema.arbOpportunities.closedAt)
          )
        );

      // Create new arb opportunity
      await db.insert(schema.arbOpportunities).values({
        matchId: arb.matchId,
        spreadRaw: arb.spreadRaw.toString(),
        spreadAdjusted: arb.spreadAdjusted.toString(),
        buyPlatform: arb.buyPlatform,
        buyPrice: arb.buyPrice.toString(),
        sellPrice: arb.sellPrice.toString(),
        volumeMin: Math.min(
          Number(match.marketA.liquidity ?? 0),
          Number(match.marketB.liquidity ?? 0)
        ).toString(),
      });
      arbCount++;
    } else {
      // No arb — close any stale open opportunities
      await db
        .update(schema.arbOpportunities)
        .set({ closedAt: now, profitable: false })
        .where(
          and(
            eq(schema.arbOpportunities.matchId, match.id),
            isNull(schema.arbOpportunities.closedAt)
          )
        );
    }
  }

  console.log(`[ArbDetector] Found ${arbCount} arb opportunities from ${activeMatches.length} matched pairs.`);
  return { arbCount, matchesScanned: activeMatches.length };
}

export { calculateArb };
