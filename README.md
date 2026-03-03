# MarketDelta

Cross-platform prediction market analytics. Compare Polymarket vs Kalshi — arb scanner, accuracy leaderboard, whale tracking.

## Stack

- **SST v4** — monorepo, all AWS (no Vercel)
- **Next.js 15** — App Router, deployed via `sst.aws.Nextjs` on CloudFront
- **PostgreSQL** — Neon (or RDS) for relational market data
- **Lambda** — data collectors (markets, prices, matching, arbs, accuracy)
- **Stripe** — Pro ($25/mo) and Enterprise ($99/mo) tiers

## Structure

```
prediction-market/
├── sst.config.ts                    # SST infra (crons, API, Next.js site)
├── packages/
│   ├── core/src/
│   │   ├── types.ts                 # Shared types
│   │   ├── matching.ts              # Cross-platform market matching
│   │   ├── schema.sql               # PostgreSQL schema
│   │   └── platforms/
│   │       ├── polymarket.ts        # Polymarket API client
│   │       └── kalshi.ts            # Kalshi API client
│   ├── functions/src/
│   │   ├── api/index.ts             # API Lambda (dashboard data)
│   │   └── collectors/
│   │       ├── markets.ts           # Market collector (5min)
│   │       ├── prices.ts            # Price snapshots (1min)
│   │       ├── matcher.ts           # Cross-platform matching (30min)
│   │       ├── arbs.ts              # Arb detector (2min)
│   │       └── accuracy.ts          # Accuracy calculator (daily)
│   └── web/                         # Next.js 15 dashboard
│       └── app/
│           ├── page.tsx             # Homepage (stats, top arbs, accuracy preview)
│           ├── layout.tsx           # Root layout
│           └── ...
└── README.md
```

## Data Sources

Both APIs are **free and public** — no API keys needed for market data.

- **Polymarket:** Gamma Markets API + CLOB API
- **Kalshi:** Public REST API (`/trade-api/v2`)

## Development

```bash
npm install
npx sst dev          # local dev (SST live Lambda + Next.js)
npx sst deploy       # deploy to AWS
```

## Status

🚧 **In development** — scaffolded, API clients built, schema defined, homepage with mock data. Next: wire up PostgreSQL, implement collectors, connect real data to dashboard.
