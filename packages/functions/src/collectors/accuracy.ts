/**
 * Accuracy Calculator — runs daily at midnight UTC
 *
 * Checks for newly resolved markets, calculates Brier scores,
 * updates accuracy records.
 *
 * Brier Score = (forecast - outcome)^2
 * - 0.0 = perfect prediction
 * - 0.25 = coin flip
 * - 1.0 = perfectly wrong
 */

import type { CalibrationPoint } from "../../../core/src/types.js";
import { db, schema } from "../../../core/src/db/index.js";
import { eq, and, isNotNull, desc, lte, sql } from "drizzle-orm";

function brierScore(forecast: number, outcome: number): number {
  return (forecast - outcome) ** 2;
}

function buildCalibrationCurve(records: { forecast: number; outcome: number }[]): CalibrationPoint[] {
  const buckets: Map<number, { forecasts: number[]; outcomes: number[] }> = new Map();

  for (let i = 0.05; i <= 0.95; i += 0.1) {
    buckets.set(Math.round(i * 100) / 100, { forecasts: [], outcomes: [] });
  }

  for (const r of records) {
    const bucket = Math.round(Math.round(r.forecast * 10) / 10 * 100) / 100;
    const key = Math.max(0.05, Math.min(0.95, bucket));
    const b = buckets.get(key);
    if (b) {
      b.forecasts.push(r.forecast);
      b.outcomes.push(r.outcome);
    }
  }

  const points: CalibrationPoint[] = [];
  for (const [bucket, data] of buckets) {
    if (data.forecasts.length > 0) {
      points.push({
        bucket,
        avgForecast: data.forecasts.reduce((a, b) => a + b, 0) / data.forecasts.length,
        avgOutcome: data.outcomes.reduce((a, b) => a + b, 0) / data.outcomes.length,
        count: data.forecasts.length,
      });
    }
  }

  return points;
}

export async function handler() {
  console.log("[AccuracyCalculator] Calculating accuracy scores...");

  // Find resolved markets that don't have accuracy records yet
  // Use a subquery approach: get resolved markets, then filter out those with records
  const resolvedMarkets = await db.query.markets.findMany({
    where: and(
      eq(schema.markets.status, "resolved"),
      isNotNull(schema.markets.outcome),
      isNotNull(schema.markets.resolvedAt)
    ),
    with: { platform: true },
  });

  // Get all existing accuracy record market IDs
  const existingRecords = await db
    .select({ marketId: schema.accuracyRecords.marketId })
    .from(schema.accuracyRecords);
  const scoredMarketIds = new Set(existingRecords.map((r) => r.marketId));

  // Filter to only unscored markets
  const unscoredMarkets = resolvedMarkets.filter((m) => !scoredMarketIds.has(m.id));

  if (unscoredMarkets.length === 0) {
    console.log("[AccuracyCalculator] No new resolved markets to score.");
    return { scored: 0 };
  }

  let scored = 0;

  for (const market of unscoredMarkets) {
    // Get the last price snapshot before resolution
    const lastSnapshot = await db
      .select({
        yesPrice: schema.priceSnapshots.yesPrice,
      })
      .from(schema.priceSnapshots)
      .where(
        and(
          eq(schema.priceSnapshots.marketId, market.id),
          lte(schema.priceSnapshots.recordedAt, market.resolvedAt!)
        )
      )
      .orderBy(desc(schema.priceSnapshots.recordedAt))
      .limit(1);

    const finalPrice = lastSnapshot[0]?.yesPrice
      ? Number(lastSnapshot[0].yesPrice)
      : market.yesPrice
        ? Number(market.yesPrice)
        : null;

    if (finalPrice === null) continue;

    const outcomeNum = market.outcome === "yes" ? 1 : 0;
    const score = brierScore(finalPrice, outcomeNum);

    await db
      .insert(schema.accuracyRecords)
      .values({
        marketId: market.id,
        platformId: market.platformId,
        category: market.category,
        finalPrice: finalPrice.toString(),
        outcome: outcomeNum.toString(),
        brierScore: score.toString(),
        resolvedAt: market.resolvedAt,
      })
      .onConflictDoUpdate({
        target: [schema.accuracyRecords.marketId, schema.accuracyRecords.platformId],
        set: {
          finalPrice: finalPrice.toString(),
          outcome: outcomeNum.toString(),
          brierScore: score.toString(),
        },
      });
    scored++;
  }

  console.log(`[AccuracyCalculator] Scored ${scored} resolved markets.`);
  return { scored };
}

export { brierScore, buildCalibrationCurve };
