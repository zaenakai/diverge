/**
 * LLM-powered structured field extraction via OpenRouter (Gemini Flash)
 *
 * Extracts structured fields from prediction market titles to enable
 * precise cross-platform matching.
 */

import type { StructuredFields } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `You extract structured fields from prediction market titles.
Return ONLY valid JSON with these fields:
{
  "asset": string or null (e.g. "BTC", "ETH", "SOL", "S&P500", "gold"),
  "type": string ("price_threshold", "election_nominee", "election_winner", "event_binary", "rate_decision", "date_event", "other"),
  "direction": string or null ("above", "below", "reach", "dip", "win", "lose", "yes", "no"),
  "threshold": number or null (the numerical target, e.g. 50000 for "$50,000"),
  "thresholdUnit": string or null ("USD", "percent", "basis_points"),
  "timeframe": string or null (ISO date like "2026-12-31" or "end of Q1 2026"),
  "resolutionType": string or null ("touch_anytime", "at_close", "at_expiry", "trimmed_mean", "official_result", "any_time_before"),
  "entity": string or null (person/org: "Donald Trump", "Fed", "Jesse Jackson Jr."),
  "category": string ("crypto", "politics", "economics", "sports", "science", "entertainment", "other"),
  "normalizedQuestion": string (the core question in a standard form, e.g. "Will BTC price exceed $100,000 before 2027-01-01?")
}

Be precise about thresholds. "$50,000" and "$55,000" are DIFFERENT thresholds.
Be precise about resolution type. "dip to X" = touch_anytime. "price at close on date" = at_close. "trimmed mean below X" = trimmed_mean.
Be precise about timeframe. "by December 31, 2026" and "by March 31, 2026" are DIFFERENT.`;

const BATCH_SYSTEM_PROMPT = `You extract structured fields from prediction market titles.
You will receive multiple titles. Return a JSON array with one object per title, in the same order.

Each object must have these fields:
{
  "asset": string or null (e.g. "BTC", "ETH", "SOL", "S&P500", "gold"),
  "type": string ("price_threshold", "election_nominee", "election_winner", "event_binary", "rate_decision", "date_event", "other"),
  "direction": string or null ("above", "below", "reach", "dip", "win", "lose", "yes", "no"),
  "threshold": number or null (the numerical target, e.g. 50000 for "$50,000"),
  "thresholdUnit": string or null ("USD", "percent", "basis_points"),
  "timeframe": string or null (ISO date like "2026-12-31" or "end of Q1 2026"),
  "resolutionType": string or null ("touch_anytime", "at_close", "at_expiry", "trimmed_mean", "official_result", "any_time_before"),
  "entity": string or null (person/org: "Donald Trump", "Fed", "Jesse Jackson Jr."),
  "category": string ("crypto", "politics", "economics", "sports", "science", "entertainment", "other"),
  "normalizedQuestion": string (the core question in a standard form)
}

Be precise about thresholds. "$50,000" and "$55,000" are DIFFERENT thresholds.
Be precise about resolution type. "dip to X" = touch_anytime. "price at close on date" = at_close. "trimmed mean below X" = trimmed_mean.
Be precise about timeframe. "by December 31, 2026" and "by March 31, 2026" are DIFFERENT.

Return ONLY valid JSON: an array of objects. No extra text.`;

/**
 * Extract structured fields from a single market title.
 */
export async function extractStructuredFields(
  apiKey: string,
  title: string,
  description?: string
): Promise<StructuredFields | null> {
  try {
    const userContent = description
      ? `Extract fields from: "${title}"\nDescription: "${description}"`
      : `Extract fields from: "${title}"`;

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error(`[Extraction] OpenRouter API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[Extraction] No content in response");
      return null;
    }

    return JSON.parse(content) as StructuredFields;
  } catch (err) {
    console.error("[Extraction] Error extracting fields:", err);
    return null;
  }
}

/**
 * Extract structured fields for a batch of market titles (up to 20).
 * Returns an array of results in the same order as input.
 * Failed extractions return null at that index.
 */
export async function extractStructuredFieldsBatch(
  apiKey: string,
  titles: { title: string; description?: string }[]
): Promise<(StructuredFields | null)[]> {
  if (titles.length === 0) return [];
  if (titles.length === 1) {
    const result = await extractStructuredFields(apiKey, titles[0].title, titles[0].description);
    return [result];
  }

  try {
    const numberedTitles = titles
      .map((t, i) => {
        const line = `${i + 1}. "${t.title}"`;
        return t.description ? `${line} (Description: "${t.description}")` : line;
      })
      .join("\n");

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: BATCH_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract fields from these ${titles.length} market titles:\n${numberedTitles}`,
          },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error(`[Extraction] Batch API error: ${res.status} ${res.statusText}`);
      return titles.map(() => null);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("[Extraction] No content in batch response");
      return titles.map(() => null);
    }

    const parsed = JSON.parse(content);

    // Handle both { results: [...] } and direct array formats
    const results: StructuredFields[] = Array.isArray(parsed)
      ? parsed
      : parsed.results || parsed.items || Object.values(parsed)[0];

    if (!Array.isArray(results)) {
      console.error("[Extraction] Batch response is not an array:", typeof parsed);
      return titles.map(() => null);
    }

    // Pad or trim to match input length
    return titles.map((_, i) => results[i] ?? null);
  } catch (err) {
    console.error("[Extraction] Batch extraction error:", err);
    return titles.map(() => null);
  }
}
