-- Prediction Market Analytics — PostgreSQL Schema
-- Run this against your Neon/RDS database

-- ── Platforms ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platforms (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  api_base    TEXT,
  fee_model   JSONB
);

INSERT INTO platforms (slug, name, api_base, fee_model) VALUES
  ('polymarket', 'Polymarket', 'https://gamma-api.polymarket.com', '{"type": "winnings", "rate": 0.02}'),
  ('kalshi', 'Kalshi', 'https://api.elections.kalshi.com/trade-api/v2', '{"type": "profit", "rate": 0.05}')
ON CONFLICT (slug) DO NOTHING;

-- ── Markets ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS markets (
  id              SERIAL PRIMARY KEY,
  platform_id     INT NOT NULL REFERENCES platforms(id),
  external_id     TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  status          TEXT DEFAULT 'active',
  resolution_date TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ,
  outcome         TEXT,
  url             TEXT,
  yes_price       DECIMAL(6,4),
  no_price        DECIMAL(6,4),
  volume_24h      DECIMAL(18,2),
  liquidity       DECIMAL(18,2),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_markets_platform_status ON markets(platform_id, status);
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);

-- ── Market Matches (cross-platform) ─────────────────
CREATE TABLE IF NOT EXISTS market_matches (
  id              SERIAL PRIMARY KEY,
  market_a_id     INT NOT NULL REFERENCES markets(id),
  market_b_id     INT NOT NULL REFERENCES markets(id),
  confidence      FLOAT NOT NULL,
  match_method    TEXT NOT NULL,
  verified        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(market_a_id, market_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_confidence ON market_matches(confidence DESC);

-- ── Price Snapshots (time-series, high volume) ──────
CREATE TABLE IF NOT EXISTS price_snapshots (
  id          BIGSERIAL PRIMARY KEY,
  market_id   INT NOT NULL REFERENCES markets(id),
  yes_price   DECIMAL(6,4),
  no_price    DECIMAL(6,4),
  volume_24h  DECIMAL(18,2),
  liquidity   DECIMAL(18,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prices_market_time ON price_snapshots(market_id, recorded_at DESC);

-- ── Arb Opportunities ───────────────────────────────
CREATE TABLE IF NOT EXISTS arb_opportunities (
  id              SERIAL PRIMARY KEY,
  match_id        INT NOT NULL REFERENCES market_matches(id),
  spread_raw      DECIMAL(6,4),
  spread_adjusted DECIMAL(6,4),
  buy_platform    TEXT NOT NULL,
  buy_price       DECIMAL(6,4),
  sell_price      DECIMAL(6,4),
  volume_min      DECIMAL(18,2),
  detected_at     TIMESTAMPTZ DEFAULT NOW(),
  closed_at       TIMESTAMPTZ,
  profitable      BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_arbs_active ON arb_opportunities(closed_at) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_arbs_spread ON arb_opportunities(spread_adjusted DESC);

-- ── Accuracy Records ────────────────────────────────
CREATE TABLE IF NOT EXISTS accuracy_records (
  id          SERIAL PRIMARY KEY,
  market_id   INT NOT NULL REFERENCES markets(id),
  platform_id INT NOT NULL REFERENCES platforms(id),
  category    TEXT,
  final_price DECIMAL(6,4),
  outcome     DECIMAL(1,0),
  brier_score DECIMAL(6,4),
  resolved_at TIMESTAMPTZ,
  UNIQUE(market_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_accuracy_platform_cat ON accuracy_records(platform_id, category);

-- ── Whale Trades ────────────────────────────────────
CREATE TABLE IF NOT EXISTS whale_trades (
  id              SERIAL PRIMARY KEY,
  market_id       INT NOT NULL REFERENCES markets(id),
  trader_address  TEXT,
  size_usd        DECIMAL(18,2),
  side            TEXT,
  price           DECIMAL(6,4),
  platform_id     INT NOT NULL REFERENCES platforms(id),
  detected_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whales_time ON whale_trades(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_whales_size ON whale_trades(size_usd DESC);

-- ── Users (Pro/Enterprise) ──────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT UNIQUE,
  wallet_address  TEXT,
  stripe_customer TEXT,
  tier            TEXT DEFAULT 'free',
  api_key         TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── User Alerts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id),
  type        TEXT NOT NULL,
  config      JSONB,
  channel     TEXT NOT NULL,
  channel_config JSONB,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
