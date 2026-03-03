import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { ArbCard } from "@/components/arb-card";
import { PlatformBadge } from "@/components/platform-badge";
import { Sparkline } from "@/components/sparkline";
import {
  platformStats,
  arbOpportunities,
  trendingMarkets,
  overallBrier,
  whaleTrades,
  formatUsd,
  formatPrice,
  timeAgo,
  categoryColors,
} from "@/lib/mock-data";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Markets" value={platformStats.totalMarkets.toLocaleString()} icon="📊" />
        <StatCard label="Matched Markets" value={platformStats.matchedMarkets.toLocaleString()} icon="🔗" />
        <StatCard label="Active Arbs" value={platformStats.activeArbs.toString()} highlight icon="⚡" />
        <StatCard label="Avg Spread" value={`${platformStats.avgSpread}%`} icon="📐" />
        <StatCard label="24h Volume" value={formatUsd(platformStats.totalVolume24h)} icon="💰" />
      </div>

      {/* Top Arb Opportunities */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>🔥</span> Top Arb Opportunities
          </h2>
          <Link href="/arbs" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {arbOpportunities.slice(0, 6).map((arb) => (
            <ArbCard key={arb.id} arb={arb} />
          ))}
        </div>
      </section>

      {/* Two-column: Trending + Whale Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Markets */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>📈</span> Trending Markets
            </h2>
            <Link href="/markets" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
              All markets →
            </Link>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
            {trendingMarkets.slice(0, 8).map((market) => (
              <div key={market.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <PlatformBadge platform={market.platform} />
                    <span className={`text-[9px] px-1 py-0.5 rounded border ${categoryColors[market.category]}`}>
                      {market.category}
                    </span>
                  </div>
                  <div className="text-sm text-white/80 truncate">{market.title}</div>
                </div>
                <Sparkline data={market.sparkline} width={60} height={20} />
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-bold">{formatPrice(market.yesPrice)}</div>
                  <div className={`text-xs font-mono ${market.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {market.change24h >= 0 ? "+" : ""}{market.change24h.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right column: Accuracy + Whale Trades */}
        <div className="space-y-6">
          {/* Platform Accuracy Snapshot */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🎯</span> Platform Accuracy
              </h2>
              <Link href="/accuracy" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
                Full analysis →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-blue-400 text-sm">Polymarket</span>
                  <span className="text-[10px] text-white/30">{overallBrier.polymarketResolved.toLocaleString()} resolved</span>
                </div>
                <div className="text-3xl font-bold font-mono text-white">{overallBrier.polymarket}</div>
                <div className="text-[10px] text-white/30 mt-0.5">Avg Brier Score (lower = better)</div>
              </div>
              <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-orange-400 text-sm">Kalshi</span>
                  <span className="text-[10px] text-white/30">{overallBrier.kalshiResolved.toLocaleString()} resolved</span>
                </div>
                <div className="text-3xl font-bold font-mono text-white">{overallBrier.kalshi}</div>
                <div className="text-[10px] text-white/30 mt-0.5">Avg Brier Score (lower = better)</div>
              </div>
            </div>
          </section>

          {/* Recent Whale Trades */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span>🐋</span> Whale Trades
              </h2>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
              {whaleTrades.slice(0, 6).map((trade) => (
                <div key={trade.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    trade.side === "YES" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {trade.side}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 truncate">{trade.market}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PlatformBadge platform={trade.platform} />
                      <span className="text-[10px] text-white/30">{timeAgo(trade.timestamp)}</span>
                      {trade.walletAddress && (
                        <span className="text-[10px] text-white/20 font-mono">{trade.walletAddress}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold">{formatUsd(trade.amount)}</div>
                    <div className="text-[10px] text-white/30">@ {Math.round(trade.price * 100)}¢</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
