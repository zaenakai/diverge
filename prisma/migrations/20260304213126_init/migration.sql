-- CreateTable
CREATE TABLE "platforms" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_base" TEXT,
    "fee_model" JSONB,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" SERIAL NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "resolution_date" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "outcome" TEXT,
    "url" TEXT,
    "yes_price" DECIMAL(6,4),
    "no_price" DECIMAL(6,4),
    "volume_24h" DECIMAL(18,2),
    "liquidity" DECIMAL(18,2),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_matches" (
    "id" SERIAL NOT NULL,
    "market_a_id" INTEGER NOT NULL,
    "market_b_id" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "match_method" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "market_id" INTEGER NOT NULL,
    "yes_price" DECIMAL(6,4),
    "no_price" DECIMAL(6,4),
    "volume_24h" DECIMAL(18,2),
    "liquidity" DECIMAL(18,2),
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "arb_opportunities" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "spread_raw" DECIMAL(6,4),
    "spread_adjusted" DECIMAL(6,4),
    "buy_platform" TEXT NOT NULL,
    "buy_price" DECIMAL(6,4),
    "sell_price" DECIMAL(6,4),
    "volume_min" DECIMAL(18,2),
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ,
    "profitable" BOOLEAN,

    CONSTRAINT "arb_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accuracy_records" (
    "id" SERIAL NOT NULL,
    "market_id" INTEGER NOT NULL,
    "platform_id" INTEGER NOT NULL,
    "category" TEXT,
    "final_price" DECIMAL(6,4),
    "outcome" DECIMAL(1,0),
    "brier_score" DECIMAL(6,4),
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "accuracy_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whale_trades" (
    "id" SERIAL NOT NULL,
    "market_id" INTEGER NOT NULL,
    "trader_address" TEXT,
    "size_usd" DECIMAL(18,2) NOT NULL,
    "side" TEXT NOT NULL,
    "price" DECIMAL(6,4),
    "platform_id" INTEGER NOT NULL,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whale_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "email_verified" TIMESTAMPTZ,
    "image" TEXT,
    "wallet_address" TEXT,
    "stripe_customer_id" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "api_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB,
    "channel" TEXT NOT NULL,
    "channel_config" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platforms_slug_key" ON "platforms"("slug");

-- CreateIndex
CREATE INDEX "markets_platform_id_status_idx" ON "markets"("platform_id", "status");

-- CreateIndex
CREATE INDEX "markets_category_idx" ON "markets"("category");

-- CreateIndex
CREATE INDEX "markets_status_idx" ON "markets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "markets_platform_id_external_id_key" ON "markets"("platform_id", "external_id");

-- CreateIndex
CREATE INDEX "market_matches_confidence_idx" ON "market_matches"("confidence" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "market_matches_market_a_id_market_b_id_key" ON "market_matches"("market_a_id", "market_b_id");

-- CreateIndex
CREATE INDEX "price_snapshots_market_id_recorded_at_idx" ON "price_snapshots"("market_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "arb_opportunities_spread_adjusted_idx" ON "arb_opportunities"("spread_adjusted" DESC);

-- CreateIndex
CREATE INDEX "accuracy_records_platform_id_category_idx" ON "accuracy_records"("platform_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "accuracy_records_market_id_platform_id_key" ON "accuracy_records"("market_id", "platform_id");

-- CreateIndex
CREATE INDEX "whale_trades_detected_at_idx" ON "whale_trades"("detected_at" DESC);

-- CreateIndex
CREATE INDEX "whale_trades_size_usd_idx" ON "whale_trades"("size_usd" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_api_key_key" ON "users"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "markets" ADD CONSTRAINT "markets_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_matches" ADD CONSTRAINT "market_matches_market_a_id_fkey" FOREIGN KEY ("market_a_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_matches" ADD CONSTRAINT "market_matches_market_b_id_fkey" FOREIGN KEY ("market_b_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arb_opportunities" ADD CONSTRAINT "arb_opportunities_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "market_matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accuracy_records" ADD CONSTRAINT "accuracy_records_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accuracy_records" ADD CONSTRAINT "accuracy_records_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whale_trades" ADD CONSTRAINT "whale_trades_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whale_trades" ADD CONSTRAINT "whale_trades_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
