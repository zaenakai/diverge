/**
 * Backfill structured fields for all active markets.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." OPENROUTER_API_KEY="sk-or-..." npx tsx scripts/backfill-structured-fields.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, isNull } from "drizzle-orm";
import * as schema from "../packages/core/src/db/schema";
import { extractStructuredFieldsBatch } from "../packages/core/src/extraction";

const BATCH_SIZE = 20;
const DELAY_MS = 200;

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is required");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  // Count total markets to backfill
  const marketsToBackfill = await db
    .select({
      id: schema.markets.id,
      title: schema.markets.title,
      description: schema.markets.description,
    })
    .from(schema.markets)
    .where(
      and(
        eq(schema.markets.status, "active"),
        isNull(schema.markets.structuredFields),
      )
    );

  const total = marketsToBackfill.length;
  console.log(`[Backfill] Found ${total} markets to process`);

  if (total === 0) {
    console.log("[Backfill] Nothing to do.");
    await pool.end();
    return;
  }

  let processed = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = marketsToBackfill.slice(i, i + BATCH_SIZE);
    const titles = batch.map((m) => ({
      title: m.title,
      description: m.description ?? undefined,
    }));

    const results = await extractStructuredFieldsBatch(apiKey, titles);

    for (let j = 0; j < batch.length; j++) {
      const fields = results[j];
      if (fields) {
        await db
          .update(schema.markets)
          .set({ structuredFields: fields })
          .where(eq(schema.markets.id, batch[j].id));
      }
    }

    processed += batch.length;
    console.log(`[Backfill] Processed ${processed}/${total} markets`);

    // Rate limit delay
    if (i + BATCH_SIZE < total) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`[Backfill] Done! Processed ${processed} markets.`);
  await pool.end();
}

main().catch((err) => {
  console.error("[Backfill] Fatal error:", err);
  process.exit(1);
});
