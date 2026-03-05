/**
 * Arb Detector — runs every 2 minutes
 *
 * For each matched market pair, calculates the price spread.
 * Filters out dead/expired/illiquid markets.
 * If spread > threshold after fees, records an arb opportunity.
 */

import { db, schema } from "../../../core/src/db/index";
import { eq, and, isNull, gt, gte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// Platform fee estimates (conservative)
const FEES: Record<string, number> = {
  polymarket: 0.02,
  kalshi: 0.05,
};

const MIN_ADJUSTED_SPREAD = 0.01;
const MAX_SPREAD = 0.50;           // 50% cap — anything higher is almost certainly a bad match
const MIN_VOLUME_24H = 100;        // $100 minimum 24h volume on BOTH sides
const MIN_LIQUIDITY = 50;          // $50 minimum liquidity
const MIN_HOURS_REMAINING = 1;     // Skip markets expiring within 1 hour

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

    if (adjustedSpread > MIN_ADJUSTED_SPREAD && s.raw <= MAX_SPREAD) {
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

  const mktA = alias(schema.markets, "mktA");
  const mktB = alias(schema.markets, "mktB");
  const platA = alias(schema.platforms, "platA");
  const platB = alias(schema.platforms, "platB");

  // Only consider high-confidence matches (≥0.70)
  const rows = await db
    .select({
      matchId: schema.marketMatches.id,
      confidence: schema.marketMatches.confidence,
      // Market A
      aStatus: mktA.status,
      aYesPrice: mktA.yesPrice,
      aVolume24h: mktA.volume24h,
      aLiquidity: mktA.liquidity,
      aResolutionDate: mktA.resolutionDate,
      aPlatformSlug: platA.slug,
      // Market B
      bStatus: mktB.status,
      bYesPrice: mktB.yesPrice,
      bVolume24h: mktB.volume24h,
      bLiquidity: mktB.liquidity,
      bResolutionDate: mktB.resolutionDate,
      bPlatformSlug: platB.slug,
    })
    .from(schema.marketMatches)
    .innerJoin(mktA, eq(schema.marketMatches.marketAId, mktA.id))
    .innerJoin(mktB, eq(schema.marketMatches.marketBId, mktB.id))
    .innerJoin(platA, eq(mktA.platformId, platA.id))
    .innerJoin(platB, eq(mktB.platformId, platB.id))
    .where(gte(schema.marketMatches.confidence, 0.70));

  const now = new Date();
  const minExpiry = new Date(now.getTime() + MIN_HOURS_REMAINING * 60 * 60 * 1000);

  // Filter: both active, both have volume, both have time remaining
  const activeMatches = rows.filter((m) => {
    if (m.aStatus !== "active" || m.bStatus !== "active") return false;

    const aVol = Number(m.aVolume24h ?? 0);
    const bVol = Number(m.bVolume24h ?? 0);
    if (aVol < MIN_VOLUME_24H || bVol < MIN_VOLUME_24H) return false;

    const aLiq = Number(m.aLiquidity ?? 0);
    const bLiq = Number(m.bLiquidity ?? 0);
    if (aLiq < MIN_LIQUIDITY && bLiq < MIN_LIQUIDITY) return false;

    // Skip if either market expires too soon
    if (m.aResolutionDate && new Date(m.aResolutionDate) < minExpiry) return false;
    if (m.bResolutionDate && new Date(m.bResolutionDate) < minExpiry) return false;

    return true;
  });

  let arbCount = 0;

  for (const match of activeMatches) {
    const priceA = match.aYesPrice ? Number(match.aYesPrice) : null;
    const priceB = match.bYesPrice ? Number(match.bYesPrice) : null;

    if (priceA === null || priceB === null) continue;

    // Skip price inversions — if one is near 0 and the other near 1, they likely
    // represent opposite sides of the same outcome (e.g., "above $X" vs "below $X")
    // or the matcher paired them wrong. Real arbs have prices on the SAME side.
    const bothLow = priceA < 0.10 && priceB < 0.10;
    const bothHigh = priceA > 0.90 && priceB > 0.90;
    const inverted = (priceA < 0.10 && priceB > 0.90) || (priceA > 0.90 && priceB < 0.10);
    if (inverted) continue;

    const polyPrice = match.aPlatformSlug === "polymarket" ? priceA : priceB;
    const kalshiPrice = match.aPlatformSlug === "kalshi" ? priceA : priceB;

    const arb = calculateArb(match.matchId, polyPrice, kalshiPrice);

    if (arb) {
      // Close any previous open arbs for this match
      await db
        .update(schema.arbOpportunities)
        .set({ closedAt: now })
        .where(
          and(
            eq(schema.arbOpportunities.matchId, match.matchId),
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
          Number(match.aLiquidity ?? 0),
          Number(match.bLiquidity ?? 0)
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
            eq(schema.arbOpportunities.matchId, match.matchId),
            isNull(schema.arbOpportunities.closedAt)
          )
        );
    }
  }

  console.log(`[ArbDetector] Found ${arbCount} arbs from ${activeMatches.length} active pairs (${rows.length} total matches, ${rows.length - activeMatches.length} filtered out).`);
  return { arbCount, matchesScanned: activeMatches.length, totalMatches: rows.length };
}

export { calculateArb };
