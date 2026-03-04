/**
 * Drizzle ORM schema — matches the existing PostgreSQL tables exactly.
 * DO NOT modify column names or types — 115K+ markets in production.
 */

import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
  bigserial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Platforms ────────────────────────────────────────

export const platforms = pgTable("platforms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  apiBase: text("api_base"),
  feeModel: jsonb("fee_model"),
});

export const platformsRelations = relations(platforms, ({ many }) => ({
  markets: many(markets),
  accuracyRecords: many(accuracyRecords),
  whaleTrades: many(whaleTrades),
}));

// ── Markets ──────────────────────────────────────────

export const markets = pgTable(
  "markets",
  {
    id: serial("id").primaryKey(),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    category: text("category"),
    status: text("status").notNull().default("active"),
    resolutionDate: timestamp("resolution_date", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    outcome: text("outcome"),
    url: text("url"),
    yesPrice: decimal("yes_price", { precision: 6, scale: 4 }),
    noPrice: decimal("no_price", { precision: 6, scale: 4 }),
    volume24h: decimal("volume_24h", { precision: 18, scale: 2 }),
    liquidity: decimal("liquidity", { precision: 18, scale: 2 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("markets_platform_id_external_id_key").on(table.platformId, table.externalId),
    index("markets_platform_id_status_idx").on(table.platformId, table.status),
    index("markets_category_idx").on(table.category),
    index("markets_status_idx").on(table.status),
  ]
);

export const marketsRelations = relations(markets, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [markets.platformId],
    references: [platforms.id],
  }),
  priceSnapshots: many(priceSnapshots),
  accuracyRecords: many(accuracyRecords),
  whaleTrades: many(whaleTrades),
  matchesAsA: many(marketMatches, { relationName: "marketA" }),
  matchesAsB: many(marketMatches, { relationName: "marketB" }),
}));

// ── Market Matches ───────────────────────────────────

export const marketMatches = pgTable(
  "market_matches",
  {
    id: serial("id").primaryKey(),
    marketAId: integer("market_a_id")
      .notNull()
      .references(() => markets.id),
    marketBId: integer("market_b_id")
      .notNull()
      .references(() => markets.id),
    confidence: doublePrecision("confidence").notNull(),
    matchMethod: text("match_method").notNull(),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_matches_market_a_id_market_b_id_key").on(table.marketAId, table.marketBId),
    index("market_matches_confidence_idx").on(table.confidence),
  ]
);

export const marketMatchesRelations = relations(marketMatches, ({ one, many }) => ({
  marketA: one(markets, {
    fields: [marketMatches.marketAId],
    references: [markets.id],
    relationName: "marketA",
  }),
  marketB: one(markets, {
    fields: [marketMatches.marketBId],
    references: [markets.id],
    relationName: "marketB",
  }),
  arbOpportunities: many(arbOpportunities),
}));

// ── Price Snapshots ──────────────────────────────────

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => markets.id),
    yesPrice: decimal("yes_price", { precision: 6, scale: 4 }),
    noPrice: decimal("no_price", { precision: 6, scale: 4 }),
    volume24h: decimal("volume_24h", { precision: 18, scale: 2 }),
    liquidity: decimal("liquidity", { precision: 18, scale: 2 }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("price_snapshots_market_id_recorded_at_idx").on(table.marketId, table.recordedAt),
  ]
);

export const priceSnapshotsRelations = relations(priceSnapshots, ({ one }) => ({
  market: one(markets, {
    fields: [priceSnapshots.marketId],
    references: [markets.id],
  }),
}));

// ── Arb Opportunities ───────────────────────────────

export const arbOpportunities = pgTable(
  "arb_opportunities",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => marketMatches.id),
    spreadRaw: decimal("spread_raw", { precision: 6, scale: 4 }),
    spreadAdjusted: decimal("spread_adjusted", { precision: 6, scale: 4 }),
    buyPlatform: text("buy_platform").notNull(),
    buyPrice: decimal("buy_price", { precision: 6, scale: 4 }),
    sellPrice: decimal("sell_price", { precision: 6, scale: 4 }),
    volumeMin: decimal("volume_min", { precision: 18, scale: 2 }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    profitable: boolean("profitable"),
  },
  (table) => [
    index("arb_opportunities_spread_adjusted_idx").on(table.spreadAdjusted),
  ]
);

export const arbOpportunitiesRelations = relations(arbOpportunities, ({ one }) => ({
  match: one(marketMatches, {
    fields: [arbOpportunities.matchId],
    references: [marketMatches.id],
  }),
}));

// ── Accuracy Records ────────────────────────────────

export const accuracyRecords = pgTable(
  "accuracy_records",
  {
    id: serial("id").primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => markets.id),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id),
    category: text("category"),
    finalPrice: decimal("final_price", { precision: 6, scale: 4 }),
    outcome: decimal("outcome", { precision: 1, scale: 0 }),
    brierScore: decimal("brier_score", { precision: 6, scale: 4 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("accuracy_records_market_id_platform_id_key").on(table.marketId, table.platformId),
    index("accuracy_records_platform_id_category_idx").on(table.platformId, table.category),
  ]
);

export const accuracyRecordsRelations = relations(accuracyRecords, ({ one }) => ({
  market: one(markets, {
    fields: [accuracyRecords.marketId],
    references: [markets.id],
  }),
  platform: one(platforms, {
    fields: [accuracyRecords.platformId],
    references: [platforms.id],
  }),
}));

// ── Whale Trades ────────────────────────────────────

export const whaleTrades = pgTable(
  "whale_trades",
  {
    id: serial("id").primaryKey(),
    marketId: integer("market_id")
      .notNull()
      .references(() => markets.id),
    traderAddress: text("trader_address"),
    sizeUsd: decimal("size_usd", { precision: 18, scale: 2 }).notNull(),
    side: text("side").notNull(),
    price: decimal("price", { precision: 6, scale: 4 }),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platforms.id),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("whale_trades_detected_at_idx").on(table.detectedAt),
    index("whale_trades_size_usd_idx").on(table.sizeUsd),
  ]
);

export const whaleTradesRelations = relations(whaleTrades, ({ one }) => ({
  market: one(markets, {
    fields: [whaleTrades.marketId],
    references: [markets.id],
  }),
  platform: one(platforms, {
    fields: [whaleTrades.platformId],
    references: [platforms.id],
  }),
}));

// ── Users ───────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id").primaryKey(), // cuid
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  walletAddress: text("wallet_address"),
  stripeCustomerId: text("stripe_customer_id"),
  tier: text("tier").notNull().default("free"),
  apiKey: text("api_key").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  alerts: many(alerts),
}));

// ── NextAuth: Accounts ──────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(), // cuid
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_provider_account_id_key").on(
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ── NextAuth: Sessions ──────────────────────────────

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // cuid
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ── NextAuth: Verification Tokens ───────────────────

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_tokens_identifier_token_key").on(table.identifier, table.token),
  ]
);

// ── Alerts ──────────────────────────────────────────

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  config: jsonb("config"),
  channel: text("channel").notNull(),
  channelConfig: jsonb("channel_config"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alertsRelations = relations(alerts, ({ one }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
}));
