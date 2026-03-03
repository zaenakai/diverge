/**
 * Accuracy Calculator — runs daily at midnight UTC
 *
 * Checks for newly resolved markets, calculates Brier scores,
 * updates accuracy leaderboard.
 *
 * Brier Score = (forecast - outcome)^2
 * - 0.0 = perfect prediction
 * - 0.25 = coin flip (50% on everything)
 * - 1.0 = perfectly wrong
 *
 * Lower is better.
 */

import type { Platform, CalibrationPoint } from "@diverge/core/types.js";

interface ResolvedMarket {
  id: number;
  platform: Platform;
  category?: string;
  lastYesPrice: number; // final price before resolution
  outcome: number; // 1 = yes, 0 = no
}

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
    // Find nearest bucket
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

  // TODO:
  // 1. Fetch recently resolved markets (last 24h) from both platforms
  // 2. For each, get the last price snapshot before resolution
  // 3. Calculate Brier score
  // 4. Store accuracy_record
  // 5. Rebuild calibration curves by platform + category
  // 6. Update accuracy_summary cache

  console.log("[AccuracyCalculator] Done.");
  return { status: "ok" };
}

export { brierScore, buildCalibrationCurve };
