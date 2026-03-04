/**
 * Accuracy Calculator — runs daily at midnight UTC
 *
 * Checks for newly resolved markets, calculates Brier scores,
 * updates accuracy records.
 *
 * Brier Score = (forecast - outcome)^2
 * - 0.0 = perfect prediction
 * - 0.25 = coin flip (50% on everything)
 * - 1.0 = perfectly wrong
 *
 * Lower is better.
 */

import type { CalibrationPoint } from "@diverge/core/types.js";
import prisma from "../db.js";

function brierScore(forecast: number, outcome: number): number {
  return (forecast - outcome) ** 2;
}

function buildCalibrationCurve(records: { forecast: number; outcome: number }[]): CalibrationPoint[] {
  const buckets: Map<number, { forecasts: number[]; outcomes: number[] }> = new Map();

  // Create buckets: 0.05, 0.15, 0.25, ..., 0.95
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

  // Find recently resolved markets that don't have accuracy records yet
  const resolvedMarkets = await prisma.market.findMany({
    where: {
      status: "resolved",
      outcome: { not: null },
      resolvedAt: { not: null },
      accuracyRecords: { none: {} },
    },
    include: { platform: true },
  });

  if (resolvedMarkets.length === 0) {
    console.log("[AccuracyCalculator] No new resolved markets to score.");
    return { scored: 0 };
  }

  let scored = 0;

  for (const market of resolvedMarkets) {
    // Get the last price snapshot before resolution
    const lastSnapshot = await prisma.priceSnapshot.findFirst({
      where: {
        marketId: market.id,
        recordedAt: { lte: market.resolvedAt! },
      },
      orderBy: { recordedAt: "desc" },
    });

    // Fall back to the market's own yesPrice if no snapshot exists
    const finalPrice = lastSnapshot?.yesPrice
      ? Number(lastSnapshot.yesPrice)
      : market.yesPrice
        ? Number(market.yesPrice)
        : null;

    if (finalPrice === null) continue;

    const outcomeNum = market.outcome === "yes" ? 1 : 0;
    const score = brierScore(finalPrice, outcomeNum);

    await prisma.accuracyRecord.upsert({
      where: {
        marketId_platformId: {
          marketId: market.id,
          platformId: market.platformId,
        },
      },
      create: {
        marketId: market.id,
        platformId: market.platformId,
        category: market.category,
        finalPrice,
        outcome: outcomeNum,
        brierScore: score,
        resolvedAt: market.resolvedAt,
      },
      update: {
        finalPrice,
        outcome: outcomeNum,
        brierScore: score,
      },
    });
    scored++;
  }

  console.log(`[AccuracyCalculator] Scored ${scored} resolved markets.`);
  return { scored };
}

export { brierScore, buildCalibrationCurve };
