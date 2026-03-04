/**
 * Arb Detector — runs every 2 minutes
 *
 * For each matched market pair, calculates the price spread.
 * If spread > threshold after fees, records an arb opportunity.
 *
 * Fee structure:
 * - Polymarket: ~2% fee on winnings (not on purchase)
 * - Kalshi: varies by market, typically 1-7% on profit
 *
 * An arb exists when:
 *   buyPrice(platformA) + fees(A) + fees(B) < sellPrice(platformB)
 */

import prisma from "../db.js";

// Platform fee estimates (conservative)
const FEES: Record<string, number> = {
  polymarket: 0.02, // 2% on winnings
  kalshi: 0.05, // ~5% average (varies)
};

const MIN_ADJUSTED_SPREAD = 0.01; // 1% minimum to be actionable

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
  // Check both directions
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

    // Adjusted for fees on both sides
    // Fee is charged on winnings (1 - buyPrice) when you win
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

  // Fetch all active matched markets with their current prices
  const matches = await prisma.marketMatch.findMany({
    where: {
      marketA: { status: "active" },
      marketB: { status: "active" },
    },
    include: {
      marketA: { include: { platform: true } },
      marketB: { include: { platform: true } },
    },
  });

  let arbCount = 0;
  const now = new Date();

  for (const match of matches) {
    const priceA = match.marketA.yesPrice ? Number(match.marketA.yesPrice) : null;
    const priceB = match.marketB.yesPrice ? Number(match.marketB.yesPrice) : null;

    if (priceA === null || priceB === null) continue;

    // Determine which is polymarket and which is kalshi
    const polyPrice = match.marketA.platform.slug === "polymarket" ? priceA : priceB;
    const kalshiPrice = match.marketA.platform.slug === "kalshi" ? priceA : priceB;

    const arb = calculateArb(match.id, polyPrice, kalshiPrice);

    if (arb) {
      // Close any previous open arbs for this match
      await prisma.arbOpportunity.updateMany({
        where: { matchId: match.id, closedAt: null },
        data: { closedAt: now },
      });

      // Create new arb opportunity
      await prisma.arbOpportunity.create({
        data: {
          matchId: arb.matchId,
          spreadRaw: arb.spreadRaw,
          spreadAdjusted: arb.spreadAdjusted,
          buyPlatform: arb.buyPlatform,
          buyPrice: arb.buyPrice,
          sellPrice: arb.sellPrice,
          volumeMin: Math.min(
            Number(match.marketA.liquidity ?? 0),
            Number(match.marketB.liquidity ?? 0)
          ),
        },
      });
      arbCount++;
    } else {
      // No arb — close any stale open opportunities for this match
      await prisma.arbOpportunity.updateMany({
        where: { matchId: match.id, closedAt: null },
        data: { closedAt: now, profitable: false },
      });
    }
  }

  console.log(`[ArbDetector] Found ${arbCount} arb opportunities from ${matches.length} matched pairs.`);
  return { arbCount, matchesScanned: matches.length };
}

export { calculateArb };
