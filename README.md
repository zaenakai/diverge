# ◇ Diverge

**Cross-platform prediction market analytics.**

Compare Polymarket vs Kalshi — arb scanner, accuracy leaderboard, whale tracking, and the data nobody else is showing you.

→ [diverge.market](https://diverge.market)

---

## What is this?

Prediction markets are the best forecasting tool we have, but the analytics tooling is fragmented. Diverge tracks markets across platforms, finds where prices **diverge**, and tells you who's more accurate.

**Core features:**
- 🔀 **Cross-platform comparison** — same event, different platforms, unified view
- 💰 **Arb scanner** — real-time price discrepancies with fee-adjusted profit estimates
- 📊 **Accuracy leaderboard** — Brier scores: which platform predicts better, by category?
- 🐋 **Whale tracking** — large trades across platforms, wallet reputation
- ⚡ **Real-time data** — prices updated every minute, arbs detected every 2 minutes

## Stack

```
Framework     SST v4 (monorepo — infra + backend + frontend)
Frontend      Next.js 15 (App Router) → CloudFront + Lambda@Edge
Database      Aurora Serverless v2 (PostgreSQL) via RDS
ORM           Prisma
Auth          NextAuth v5 (Google + GitHub)
Workers       Lambda functions (data collection, matching, arb detection)
Payments      Stripe (Pro + Enterprise tiers)
Hosting       100% AWS via SST — no Vercel
Domain        diverge.market (Route 53)
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    diverge.market                    │
│              Next.js 15 on CloudFront               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Polymarket│  │  Kalshi  │  │  More platforms  │  │
│  │   API     │  │   API    │  │    (future)      │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
│       ▼              ▼                 ▼             │
│  ┌──────────────────────────────────────────────┐   │
│  │           Lambda Cron Workers                 │   │
│  │  • Markets (5min)  • Prices (1min)           │   │
│  │  • Matcher (30min) • Arbs (2min)             │   │
│  │  • Accuracy (daily)                          │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                               │
│                     ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │        Aurora Serverless v2 (PostgreSQL)      │   │
│  │  markets · matches · prices · arbs · whales  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Project Structure

```
diverge/
├── sst.config.ts                       # SST infra definition
├── prisma/
│   └── schema.prisma                   # Database schema (Prisma)
├── packages/
│   ├── core/src/
│   │   ├── types.ts                    # Shared TypeScript types
│   │   ├── matching.ts                 # Cross-platform market matching engine
│   │   └── platforms/
│   │       ├── polymarket.ts           # Polymarket API client (Gamma + CLOB)
│   │       └── kalshi.ts              # Kalshi public API client
│   ├── functions/src/
│   │   ├── api/index.ts               # API Lambda (serves dashboard data)
│   │   └── collectors/
│   │       ├── markets.ts             # Fetch markets from both platforms
│   │       ├── prices.ts              # Price snapshots every minute
│   │       ├── matcher.ts             # Cross-platform market matching
│   │       ├── arbs.ts               # Arb opportunity detection
│   │       └── accuracy.ts           # Brier score calculation
│   └── web/                           # Next.js 15 frontend
│       ├── app/
│       │   ├── page.tsx              # Homepage
│       │   ├── layout.tsx            # Root layout
│       │   └── api/auth/            # NextAuth routes
│       └── lib/
│           ├── auth.ts              # NextAuth config
│           └── db.ts                # Prisma client
└── README.md
```

## Data Sources

Both platforms have **free public REST APIs** — no API keys needed for market data.

| Source | What | Auth |
|--------|------|------|
| Polymarket Gamma API | Markets, metadata, volume | None |
| Polymarket CLOB API | Prices, orderbooks, trades | None |
| Kalshi Public API | Markets, prices, orderbooks | None |

## Pricing

| | Free | Pro ($25/mo) | Enterprise ($99/mo) |
|--|------|-------------|---------------------|
| Market explorer | ✅ | ✅ | ✅ |
| Cross-platform comparison | 10/day | Unlimited | Unlimited |
| Arb scanner | Top 5, delayed | Real-time, all | Real-time + push |
| Accuracy leaderboard | Current month | Full history | Full history + API |
| Whale tracking | Top 10 | Full feed | Full feed + API |
| Alerts | 3 | 50 | Unlimited |
| API access | ❌ | ❌ | ✅ |

## Development

```bash
# Install dependencies
npm install
cd packages/web && npm install

# Generate Prisma client
npx prisma generate

# Local dev (SST live Lambda + Next.js)
npx sst dev

# Deploy to AWS
npx sst deploy --stage production
```

## Environment Variables

All secrets are managed via SST and stored encrypted in AWS Parameter Store.

```bash
# Set secrets (one-time setup)
npx sst secret set NextAuthSecret $(openssl rand -base64 32)
npx sst secret set GoogleClientId your-google-client-id
npx sst secret set GoogleClientSecret your-google-client-secret
npx sst secret set GithubClientId your-github-client-id
npx sst secret set GithubClientSecret your-github-client-secret
npx sst secret set StripeSecretKey sk_live_...
npx sst secret set StripeWebhookSecret whsec_...
```

| Variable | Type | How it's set |
|----------|------|-------------|
| `DATABASE_URL` | Auto | Linked via `sst.aws.Postgres` |
| `NEXTAUTH_SECRET` | SST Secret | `npx sst secret set` |
| `NEXTAUTH_URL` | Env var | Hardcoded in `sst.config.ts` |
| `GOOGLE_CLIENT_ID` | SST Secret | `npx sst secret set` |
| `GOOGLE_CLIENT_SECRET` | SST Secret | `npx sst secret set` |
| `GITHUB_CLIENT_ID` | SST Secret | `npx sst secret set` |
| `GITHUB_CLIENT_SECRET` | SST Secret | `npx sst secret set` |
| `STRIPE_SECRET_KEY` | SST Secret | `npx sst secret set` |
| `STRIPE_WEBHOOK_SECRET` | SST Secret | `npx sst secret set` |

## Status

🚧 **In development**

- [x] SST infra (VPC, Aurora, CloudFront, Lambda crons)
- [x] Prisma schema (all models + NextAuth)
- [x] Polymarket + Kalshi API clients
- [x] Cross-platform market matching engine
- [x] Arb detection with fee-adjusted spreads
- [x] Accuracy tracking (Brier scores + calibration)
- [x] NextAuth (Google + GitHub)
- [x] Homepage with mock data
- [ ] Wire collectors to database
- [ ] Dashboard pages (markets, compare, arbs, accuracy)
- [ ] Stripe integration
- [ ] Landing page
- [ ] Domain setup (diverge.market)

---

Built by [@zaenakai](https://x.com/0xzeeeek)
