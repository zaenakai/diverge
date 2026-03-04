import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { ArbCard } from "@/components/arb-card";
import { PlatformBadge } from "@/components/platform-badge";
import {
  platformStats,
  arbOpportunities,
  biggestMovers,
  whaleTrades,
  formatUsd,
  timeAgo,
} from "@/lib/mock-data";

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Hero */}
      <section className="py-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Find price gaps between prediction markets before anyone else
        </h1>
        <p className="text-white/50 mt-2 text-lg max-w-2xl">
          Diverge monitors Polymarket & Kalshi in real-time, surfacing arbitrage opportunities the moment spreads appear.
        </p>
        <Link
          href="/arbs"
          className="inline-flex items-center mt-4 px-5 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition"
        >
          Explore Arb Opportunities →
        </Link>
      </section>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 rounded-xl border border-white/[0.06] overflow-hidden">
        {[
          { label: "Total Markets", value: platformStats.totalMarkets.toLocaleString(), icon: "📊" },
          { label: "Matched Markets", value: platformStats.matchedMarkets.toLocaleString(), icon: "🔗" },
          { label: "Active Arbs", value: platformStats.activeArbs.toString(), icon: "⚡", highlight: true },
          { label: "Avg Spread", value: `${platformStats.avgSpread}%`, icon: "📐" },
          { label: "24h Volume", value: formatUsd(platformStats.totalVolume24h), icon: "💰" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`p-4 ${
              stat.highlight ? "bg-emerald-500/5" : "bg-white/[0.02]"
            } ${i > 0 ? "border-l border-white/[0.06]" : ""}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{stat.icon}</span>
              <span className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold font-mono mt-1 ${stat.highlight ? "text-emerald-400" : "text-white"}`}>
              {stat.value}
            </div>
          </div>
        ))}
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

        {/* Pro CTA */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-white/50">
            See 3 of 23 active arbs. Unlock all with{" "}
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold mx-1">
              Pro
            </span>
          </p>
          <Link
            href="/pricing"
            className="shrink-0 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Upgrade to Pro →
          </Link>
        </div>
      </section>

      {/* Two-column: Biggest Movers + Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biggest Movers (24h) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>📈</span> Biggest Movers (24h)
            </h2>
            <Link href="/markets" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
              All markets →
            </Link>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] divide-y divide-white/[0.06]">
            {biggestMovers.map((mover) => (
              <div key={mover.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition cursor-pointer">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ${
                  mover.direction === "up" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {mover.direction === "up" ? "↑" : "↓"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/80 truncate">{mover.title}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {mover.platforms.map((p) => (
                      <PlatformBadge key={p} platform={p} />
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-mono font-bold ${mover.spreadChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {mover.spreadChange > 0 ? "+" : ""}{mover.spreadChange.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-white/30">spread {mover.spreadChange > 0 ? "increase" : "decrease"}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Whale Trades */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>🐋</span> Whale Trades
            </h2>
            <Link href="/whales" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
              View All →
            </Link>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] divide-y divide-white/[0.06]">
            {whaleTrades.slice(0, 6).map((trade) => (
              <div key={trade.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
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
  );
}
