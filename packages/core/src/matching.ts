/**
 * Cross-platform market matching
 *
 * Strategy:
 * 1. Normalize titles (lowercase, strip punctuation, standardize dates/names)
 * 2. Extract structured features (date, entity, event type)
 * 3. Exact match on structured features first (highest confidence)
 * 4. Fuzzy match on normalized titles (lower confidence)
 * 5. Manual curation for ambiguous cases
 */

import type { Market, MatchMethod } from "./types.js";

interface MatchCandidate {
  marketA: Market;
  marketB: Market;
  confidence: number;
  method: MatchMethod;
}

// ── Title Normalization ─────────────────────────────

const STOP_WORDS = new Set([
  "will", "the", "a", "an", "be", "by", "in", "on", "at", "to", "of",
  "or", "and", "is", "for", "this", "that", "it", "its", "than", "from",
]);

function normalize(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => !STOP_WORDS.has(w) && w.length > 1)
    .join(" ")
    .trim();
}

// ── Feature Extraction ──────────────────────────────

interface MarketFeatures {
  normalizedTitle: string;
  entity?: string; // "bitcoin", "trump", "fed"
  date?: string; // "2026-12-31"
  threshold?: number; // "$100,000", "3.5%"
  direction?: "above" | "below" | "yes" | "no";
  category?: string;
}

const DATE_PATTERNS = [
  /(\d{4})-(\d{2})-(\d{2})/,
  /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/i,
  /\d{1,2}\/\d{1,2}\/\d{4}/,
  /(?:by|before|on|after)\s+((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2})/i,
];

const PRICE_PATTERNS = [
  /\$[\d,]+(?:\.\d+)?(?:k|m|b)?/i,
  /[\d,]+(?:\.\d+)?\s*(?:dollars|usd)/i,
  /[\d.]+%/,
];

const ENTITY_ALIASES: Record<string, string[]> = {
  bitcoin: ["btc", "bitcoin"],
  ethereum: ["eth", "ethereum", "ether"],
  solana: ["sol", "solana"],
  trump: ["trump", "donald trump"],
  fed: ["fed", "federal reserve", "fomc"],
  sp500: ["s&p 500", "s&p", "sp500", "spy"],
};

function extractFeatures(market: Market): MarketFeatures {
  const title = market.title;
  const normalized = normalize(title);

  // Extract entity
  let entity: string | undefined;
  for (const [canonical, aliases] of Object.entries(ENTITY_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a))) {
      entity = canonical;
      break;
    }
  }

  // Extract date
  let date: string | undefined;
  for (const pattern of DATE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      date = match[0];
      break;
    }
  }

  // Extract threshold
  let threshold: number | undefined;
  for (const pattern of PRICE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      threshold = parseFloat(match[0].replace(/[$,%]/g, "").replace(/k/i, "000").replace(/m/i, "000000"));
      break;
    }
  }

  // Extract direction
  let direction: MarketFeatures["direction"];
  if (/above|exceed|over|higher|more than|reach/i.test(title)) direction = "above";
  if (/below|under|lower|less than|drop/i.test(title)) direction = "below";

  return {
    normalizedTitle: normalized,
    entity,
    date,
    threshold,
    direction,
    category: market.category,
  };
}

// ── Similarity Scoring ──────────────────────────────

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(" "));
  const setB = new Set(b.split(" "));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

// ── Main Matching Function ──────────────────────────

export function findMatches(
  polymarketMarkets: Market[],
  kalshiMarkets: Market[],
  minConfidence = 0.6
): MatchCandidate[] {
  const matches: MatchCandidate[] = [];
  const usedKalshi = new Set<number>();

  // Extract features for all markets
  const polyFeatures = polymarketMarkets.map((m) => ({
    market: m,
    features: extractFeatures(m),
  }));
  const kalshiFeatures = kalshiMarkets.map((m) => ({
    market: m,
    features: extractFeatures(m),
  }));

  // Pass 1: Structured matching (high confidence)
  for (const pm of polyFeatures) {
    for (const km of kalshiFeatures) {
      if (usedKalshi.has(km.market.id)) continue;

      const pmf = pm.features;
      const kmf = km.features;

      // Must share entity + date + threshold/direction
      if (pmf.entity && pmf.entity === kmf.entity) {
        let confidence = 0.6;

        if (pmf.date && kmf.date && pmf.date === kmf.date) confidence += 0.15;
        if (pmf.threshold && kmf.threshold && Math.abs(pmf.threshold - kmf.threshold) < 1) confidence += 0.15;
        if (pmf.direction && pmf.direction === kmf.direction) confidence += 0.1;

        if (confidence >= minConfidence) {
          matches.push({
            marketA: pm.market,
            marketB: km.market,
            confidence: Math.min(confidence, 1.0),
            method: "auto_structured",
          });
          usedKalshi.add(km.market.id);
          break;
        }
      }
    }
  }

  // Pass 2: Fuzzy matching for unmatched markets
  for (const pm of polyFeatures) {
    if (matches.some((m) => m.marketA.id === pm.market.id)) continue;

    let bestMatch: MatchCandidate | null = null;

    for (const km of kalshiFeatures) {
      if (usedKalshi.has(km.market.id)) continue;

      const similarity = jaccardSimilarity(pm.features.normalizedTitle, km.features.normalizedTitle);
      const confidence = similarity * 0.85; // fuzzy match caps at 0.85

      if (confidence >= minConfidence && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = {
          marketA: pm.market,
          marketB: km.market,
          confidence,
          method: "auto_fuzzy",
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
      usedKalshi.add(bestMatch.marketB.id);
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

export { normalize, extractFeatures, jaccardSimilarity };
