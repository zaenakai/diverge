import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Documentation — Diverge",
  description:
    "Programmatic access to cross-platform prediction market data. REST API and WebSocket for markets, arbitrage, prices, and accuracy.",
};

interface Endpoint {
  method: string;
  path: string;
  description: string;
  params?: { name: string; type: string; description: string }[];
  response: string;
}

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/markets",
    description:
      "List all tracked markets. Filter by platform, category, or status.",
    params: [
      { name: "platform", type: "string", description: '"polymarket" or "kalshi"' },
      { name: "category", type: "string", description: '"politics", "crypto", "sports", etc.' },
      { name: "status", type: "string", description: '"active", "resolved", "all"' },
      { name: "limit", type: "number", description: "Results per page (default 50, max 200)" },
      { name: "offset", type: "number", description: "Pagination offset" },
    ],
    response: `{
  "markets": [
    {
      "id": "mkt_8f3a2b",
      "title": "Will Bitcoin exceed $150k by end of 2026?",
      "platform": "polymarket",
      "category": "crypto",
      "status": "active",
      "lastPrice": 0.42,
      "volume": 2847593,
      "updatedAt": "2026-03-05T23:58:00Z"
    }
  ],
  "total": 59234,
  "limit": 50,
  "offset": 0
}`,
  },
  {
    method: "GET",
    path: "/api/v1/markets/:id",
    description:
      "Get full market details including metadata and recent price history.",
    params: [
      { name: "history", type: "string", description: 'Price history range: "1d", "7d", "30d", "all"' },
    ],
    response: `{
  "id": "mkt_8f3a2b",
  "title": "Will Bitcoin exceed $150k by end of 2026?",
  "platform": "polymarket",
  "category": "crypto",
  "status": "active",
  "lastPrice": 0.42,
  "volume": 2847593,
  "createdAt": "2025-11-15T10:00:00Z",
  "updatedAt": "2026-03-05T23:58:00Z",
  "priceHistory": [
    { "timestamp": "2026-03-05T23:00:00Z", "price": 0.41 },
    { "timestamp": "2026-03-05T23:30:00Z", "price": 0.42 }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/matches",
    description:
      "Cross-platform matched markets — identical events listed on both Polymarket and Kalshi.",
    params: [
      { name: "category", type: "string", description: "Filter by category" },
      { name: "minDivergence", type: "number", description: "Minimum price divergence (0-1)" },
      { name: "limit", type: "number", description: "Results per page (default 50)" },
    ],
    response: `{
  "matches": [
    {
      "id": "match_4c9e1a",
      "title": "Will Bitcoin exceed $150k by end of 2026?",
      "polymarket": {
        "id": "mkt_8f3a2b",
        "price": 0.42,
        "volume": 2847593
      },
      "kalshi": {
        "id": "mkt_k7d3f1",
        "price": 0.38,
        "volume": 1205847
      },
      "divergence": 0.04,
      "matchConfidence": 0.94,
      "updatedAt": "2026-03-05T23:58:00Z"
    }
  ],
  "total": 3847
}`,
  },
  {
    method: "GET",
    path: "/api/v1/arbs",
    description:
      "Active arbitrage opportunities — matched markets with profitable price differences.",
    params: [
      { name: "minSpread", type: "number", description: "Minimum spread percentage (default 2)" },
      { name: "sortBy", type: "string", description: '"spread", "volume", "updatedAt"' },
      { name: "limit", type: "number", description: "Results per page (default 20)" },
    ],
    response: `{
  "arbs": [
    {
      "id": "arb_2f8c4d",
      "title": "Democrats win 2026 midterms",
      "buyPlatform": "kalshi",
      "buyPrice": 0.35,
      "sellPlatform": "polymarket",
      "sellPrice": 0.42,
      "spread": 0.07,
      "spreadPct": 7.0,
      "combinedVolume": 5200000,
      "detectedAt": "2026-03-05T23:45:00Z"
    }
  ],
  "total": 23
}`,
  },
  {
    method: "GET",
    path: "/api/v1/prices/:marketId",
    description:
      "Full price snapshot history for a specific market.",
    params: [
      { name: "from", type: "string", description: "Start date (ISO 8601)" },
      { name: "to", type: "string", description: "End date (ISO 8601)" },
      { name: "interval", type: "string", description: '"1m", "5m", "1h", "1d"' },
    ],
    response: `{
  "marketId": "mkt_8f3a2b",
  "platform": "polymarket",
  "prices": [
    { "timestamp": "2026-03-05T00:00:00Z", "price": 0.39, "volume": 42850 },
    { "timestamp": "2026-03-05T01:00:00Z", "price": 0.40, "volume": 38200 },
    { "timestamp": "2026-03-05T02:00:00Z", "price": 0.41, "volume": 51300 }
  ],
  "interval": "1h"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/accuracy",
    description:
      "Platform accuracy scores — Brier scores overall and by category.",
    params: [
      { name: "category", type: "string", description: "Filter by category" },
    ],
    response: `{
  "overall": {
    "polymarket": { "brierScore": 0.103, "resolved": 18542 },
    "kalshi": { "brierScore": 0.118, "resolved": 12847 }
  },
  "byCategory": [
    {
      "category": "politics",
      "polymarket": { "brierScore": 0.089, "resolved": 4521 },
      "kalshi": { "brierScore": 0.095, "resolved": 3847 }
    }
  ]
}`,
  },
  {
    method: "WebSocket",
    path: "/api/v1/ws",
    description:
      "Real-time price updates and arbitrage alerts. Subscribe to specific markets or all arb events.",
    params: [
      { name: "subscribe", type: "string[]", description: 'Channel names: "prices", "arbs", "markets"' },
      { name: "marketIds", type: "string[]", description: "Filter price updates to specific markets" },
    ],
    response: `// Subscribe message
{ "type": "subscribe", "channels": ["arbs", "prices"] }

// Price update event
{
  "type": "price_update",
  "marketId": "mkt_8f3a2b",
  "platform": "polymarket",
  "price": 0.43,
  "previousPrice": 0.42,
  "timestamp": "2026-03-05T23:59:30Z"
}

// Arb alert event
{
  "type": "arb_alert",
  "arbId": "arb_2f8c4d",
  "title": "Democrats win 2026 midterms",
  "spread": 0.07,
  "spreadPct": 7.0,
  "detectedAt": "2026-03-05T23:59:45Z"
}`,
  },
];

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
    POST: "border-blue-500/30 text-blue-400 bg-blue-500/10",
    WebSocket: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  };

  return (
    <span
      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${colors[method] ?? "border-white/20 text-white/60"}`}
    >
      {method}
    </span>
  );
}

function EndpointSection({ endpoint }: { endpoint: Endpoint }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-mono text-white/80">{endpoint.path}</code>
      </div>

      <div className="p-5 space-y-5">
        <p className="text-sm text-white/60">{endpoint.description}</p>

        {/* Parameters */}
        {endpoint.params && endpoint.params.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
              {endpoint.method === "WebSocket" ? "Options" : "Query Parameters"}
            </h4>
            <div className="space-y-2">
              {endpoint.params.map((param) => (
                <div
                  key={param.name}
                  className="flex items-baseline gap-3 text-sm"
                >
                  <code className="text-emerald-400 font-mono text-xs shrink-0">
                    {param.name}
                  </code>
                  <span className="text-white/20 font-mono text-xs">
                    {param.type}
                  </span>
                  <span className="text-white/50 text-xs">
                    {param.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response */}
        <div>
          <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
            {endpoint.method === "WebSocket" ? "Messages" : "Example Response"}
          </h4>
          <div className="rounded-lg bg-[#111] border border-white/[0.06] overflow-x-auto">
            <pre className="p-4 text-xs font-mono text-white/70 leading-relaxed">
              {endpoint.response}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="mb-12">
          <Badge variant="outline" className="mb-4 border-purple-500/30 text-purple-400">
            API
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Diverge API
          </h1>
          <p className="text-lg text-white/50 max-w-2xl">
            Programmatic access to cross-platform prediction market data.
            Available on the{" "}
            <Link href="/pricing" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Enterprise plan
            </Link>
            .
          </p>
        </div>

        {/* Auth info */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 mb-8">
          <h3 className="text-sm font-semibold mb-2">Authentication</h3>
          <p className="text-sm text-white/50 mb-3">
            All requests require an API key passed via the{" "}
            <code className="text-emerald-400 text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">
              Authorization
            </code>{" "}
            header.
          </p>
          <div className="rounded-lg bg-[#111] border border-white/[0.06] overflow-x-auto">
            <pre className="p-4 text-xs font-mono text-white/70">
{`curl https://api.diverge.market/api/v1/markets \\
  -H "Authorization: Bearer dvg_your_api_key"`}
            </pre>
          </div>
        </div>

        {/* Rate limits */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 mb-12">
          <h3 className="text-sm font-semibold mb-2">Rate Limits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="text-white/40 text-xs mb-1">REST endpoints</div>
              <div className="font-semibold">1,000 req/min</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="text-white/40 text-xs mb-1">WebSocket connections</div>
              <div className="font-semibold">10 concurrent</div>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
              <div className="text-white/40 text-xs mb-1">Base URL</div>
              <div className="font-mono text-xs font-semibold">api.diverge.market</div>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <h2 className="text-2xl font-bold mb-6">Endpoints</h2>
        <div className="space-y-6 mb-16">
          {endpoints.map((endpoint) => (
            <EndpointSection key={endpoint.path} endpoint={endpoint} />
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Get API Access</h3>
          <p className="text-sm text-white/50 mb-6">
            The Diverge API is available on the Enterprise plan. Unlimited
            requests, WebSocket streaming, and priority support.
          </p>
          <Link href="/pricing">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-medium px-8">
              View Enterprise Plan →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
