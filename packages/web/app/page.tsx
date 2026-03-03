import Link from "next/link";

// TODO: Replace with real API calls
const MOCK_DATA = {
  totalMarkets: 2847,
  matchedMarkets: 312,
  activeArbs: 23,
  avgSpread: 3.2,
  totalVolume24h: 14_200_000,
};

const MOCK_ARBS = [
  {
    id: 1,
    title: "Will Bitcoin exceed $150K by Dec 2026?",
    polyPrice: 0.34,
    kalshiPrice: 0.41,
    spread: 7.0,
    volume: 850_000,
  },
  {
    id: 2,
    title: "Will the Fed cut rates in June 2026?",
    polyPrice: 0.62,
    kalshiPrice: 0.55,
    spread: 7.0,
    volume: 1_200_000,
  },
  {
    id: 3,
    title: "Trump approval above 50% on July 1?",
    polyPrice: 0.28,
    kalshiPrice: 0.33,
    spread: 5.0,
    volume: 430_000,
  },
];

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-sm">
              Δ
            </div>
            <span className="font-bold text-lg">MarketDelta</span>
            <span className="text-xs text-white/40 ml-2">BETA</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-white/60">
            <Link href="/markets" className="hover:text-white transition">
              Markets
            </Link>
            <Link href="/compare" className="hover:text-white transition">
              Compare
            </Link>
            <Link href="/arbs" className="hover:text-white transition">
              Arb Scanner
            </Link>
            <Link href="/accuracy" className="hover:text-white transition">
              Accuracy
            </Link>
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm transition">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Stats */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-5 gap-4">
          {[
            {
              label: "Total Markets",
              value: MOCK_DATA.totalMarkets.toLocaleString(),
            },
            {
              label: "Cross-Platform Matches",
              value: MOCK_DATA.matchedMarkets.toLocaleString(),
            },
            {
              label: "Active Arb Opportunities",
              value: MOCK_DATA.activeArbs.toString(),
              highlight: true,
            },
            {
              label: "Avg Spread",
              value: `${MOCK_DATA.avgSpread}%`,
            },
            {
              label: "24h Volume",
              value: formatUsd(MOCK_DATA.totalVolume24h),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-4 ${
                stat.highlight
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="text-xs text-white/40 mb-1">{stat.label}</div>
              <div
                className={`text-2xl font-bold ${
                  stat.highlight ? "text-emerald-400" : ""
                }`}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Arbs */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">🔥 Top Arb Opportunities</h2>
          <Link
            href="/arbs"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {MOCK_ARBS.map((arb) => (
            <div
              key={arb.id}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-5 hover:border-emerald-500/30 transition cursor-pointer"
            >
              <div className="text-sm font-medium mb-3 leading-tight">
                {arb.title}
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <div className="text-xs text-white/40">Polymarket</div>
                  <div className="text-lg font-mono">
                    {(arb.polyPrice * 100).toFixed(0)}¢
                  </div>
                </div>
                <div className="text-white/20">vs</div>
                <div>
                  <div className="text-xs text-white/40">Kalshi</div>
                  <div className="text-lg font-mono">
                    {(arb.kalshiPrice * 100).toFixed(0)}¢
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold text-sm">
                  {arb.spread}% spread
                </span>
                <span className="text-xs text-white/40">
                  {formatUsd(arb.volume)} vol
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Comparison Preview */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">📊 Platform Accuracy</h2>
          <Link
            href="/accuracy"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            Full leaderboard →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              platform: "Polymarket",
              brier: 0.142,
              markets: 1832,
              color: "text-blue-400",
            },
            {
              platform: "Kalshi",
              brier: 0.158,
              markets: 1015,
              color: "text-orange-400",
            },
          ].map((p) => (
            <div
              key={p.platform}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${p.color}`}>
                  {p.platform}
                </span>
                <span className="text-xs text-white/40">
                  {p.markets.toLocaleString()} resolved markets
                </span>
              </div>
              <div className="text-3xl font-bold font-mono">{p.brier}</div>
              <div className="text-xs text-white/40 mt-1">
                Avg Brier Score (lower = better)
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-white/40">
          <div>
            MarketDelta — Cross-platform prediction market analytics
          </div>
          <div className="flex gap-4">
            <a href="https://x.com/zaenakai" className="hover:text-white">
              Twitter
            </a>
            <a href="#" className="hover:text-white">
              API Docs
            </a>
            <a href="#" className="hover:text-white">
              About
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
