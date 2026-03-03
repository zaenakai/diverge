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

// Platform fee estimates (conservative)
const FEES = {
  polymarket: 0.02, // 2% on winnings
  kalshi: 0.05, // ~5% average (varies)
};

interface ArbCalc {
  matchId: number;
  spreadRaw: number;
  spreadAdjusted: number;
  buyPlatform: "polymarket" | "kalshi";
  buyPrice: number;
  sellPrice: number;
  estimatedProfit: number;
}

function calculateArb(
  matchId: number,
  polyPrice: number,
  kalshiPrice: number
): ArbCalc | null {
  // Check both directions
  const spreads = [
    {
      buyPlatform: "polymarket" as const,
      buyPrice: polyPrice,
      sellPrice: kalshiPrice,
      raw: kalshiPrice - polyPrice,
    },
    {
      buyPlatform: "kalshi" as const,
      buyPrice: kalshiPrice,
      sellPrice: polyPrice,
      raw: polyPrice - kalshiPrice,
    },
  ];

  for (const s of spreads) {
    if (s.raw <= 0) continue;

    // Adjusted for fees on both sides
    const buyFee = FEES[s.buyPlatform] * (1 - s.buyPrice); // fee on potential winnings
    const sellPlatform = s.buyPlatform === "polymarket" ? "kalshi" : "polymarket";
    const sellFee = FEES[sellPlatform] * (1 - s.sellPrice);

    const adjustedSpread = s.raw - buyFee - sellFee;

    if (adjustedSpread > 0.01) {
      // Min 1% adjusted spread to be worth it
      return {
        matchId,
        spreadRaw: s.raw,
        spreadAdjusted: adjustedSpread,
        buyPlatform: s.buyPlatform,
        buyPrice: s.buyPrice,
        sellPrice: s.sellPrice,
        estimatedProfit: adjustedSpread, // per $1 of capital
      };
    }
  }

  return null;
}

export async function handler() {
  console.log("[ArbDetector] Scanning for arbitrage opportunities...");

  // TODO: Fetch all matched markets with current prices
  // const matches = await db.getMatchedMarketsWithPrices();
  //
  // let arbCount = 0;
  // for (const match of matches) {
  //   const arb = calculateArb(match.id, match.polyPrice, match.kalshiPrice);
  //   if (arb) {
  //     await db.upsertArbOpportunity(arb);
  //     arbCount++;
  //   }
  // }
  //
  // console.log(`[ArbDetector] Found ${arbCount} arb opportunities`);

  console.log("[ArbDetector] Done.");
  return { status: "ok" };
}

export { calculateArb };
