"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArbCard } from "@/components/arb-card";
import { PlatformBadge } from "@/components/platform-badge";
import { formatUsd, timeAgo, type ArbOpportunity, type Platform } from "@/lib/format";
import {
  getStats,
  getArbs,
  getMatches,
  getWhales,
  type StatsResponse,
  type ArbResult,
  type MatchedMarketPair,
  type WhaleTradeResult,
} from "@/lib/api";

// ── Transform helpers ────────────────────────────────

function arbToCard(arb: ArbResult): ArbOpportunity {
  const priceA = arb.marketA.yesPrice ?? 0;
  const priceB = arb.marketB.yesPrice ?? 0;
  const buyPlatform = (arb.buyPlatform ?? arb.marketA.platform.slug) as Platform;
  const sellPlatform = buyPlatform === "polymarket" ? "kalshi" : "polymarket";
  const rawSpread = arb.spreadRaw ? Math.abs(arb.spreadRaw) * 100 : Math.abs(priceA - priceB) * 100;
  const adjustedSpread = arb.spreadAdjusted ? Math.abs(arb.spreadAdjusted) * 100 : rawSpread * 0.85;

  // Show time until earliest market resolution
  const resA = arb.marketA.resolutionDate ? new Date(arb.marketA.resolutionDate).getTime() : Infinity;
  const resB = arb.marketB.resolutionDate ? new Date(arb.marketB.resolutionDate).getTime() : Infinity;
  const earliestRes = Math.min(resA, resB);
  const nowMs = Date.now();
  const diffMins = earliestRes === Infinity ? -1 : Math.max(0, Math.floor((earliestRes - nowMs) / 60000));
  const days = diffMins >= 0 ? Math.floor(diffMins / 1440) : 0;
  const hours = diffMins >= 0 ? Math.floor((diffMins % 1440) / 60) : 0;
  const mins = diffMins >= 0 ? diffMins % 60 : 0;

  return {
    id: String(arb.id),
    title: arb.marketA.title || arb.marketB.title,
    category: arb.marketA.category ?? arb.marketB.category ?? "Other",
    buyPlatform,
    sellPlatform,
    buyPrice: arb.buyPrice ?? (buyPlatform === arb.marketA.platform.slug ? priceA : priceB),
    sellPrice: arb.sellPrice ?? (buyPlatform === arb.marketA.platform.slug ? priceB : priceA),
    rawSpread,
    adjustedSpread,
    volume: arb.volumeMin ?? (arb.marketA.volume24h ?? 0) + (arb.marketB.volume24h ?? 0),
    trend: "stable",
    timeOpen: diffMins < 0 ? "—" : days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`,
    buyUrl: buyPlatform === arb.marketA.platform.slug ? arb.marketA.url : arb.marketB.url,
    sellUrl: buyPlatform === arb.marketA.platform.slug ? arb.marketB.url : arb.marketA.url,
  };
}

interface MoverItem {
  id: string;
  title: string;
  platforms: Platform[];
  direction: "up" | "down";
  spreadChange: number;
}

function matchToMover(match: MatchedMarketPair): MoverItem {
  const platforms: Platform[] = [
    match.marketA.platform.slug as Platform,
    match.marketB.platform.slug as Platform,
  ];
  return {
    id: String(match.id),
    title: match.marketA.title || match.marketB.title,
    platforms,
    direction: match.spread > 0 ? "up" : "down",
    spreadChange: match.spread,
  };
}

interface WhaleDisplay {
  id: number;
  market: string;
  platform: Platform;
  side: string;
  amount: number;
  price: number;
  timestamp: string;
  walletAddress: string | null;
}

function whaleToDisplay(trade: WhaleTradeResult): WhaleDisplay {
  return {
    id: trade.id,
    market: trade.marketTitle,
    platform: trade.platform as Platform,
    side: trade.side.toUpperCase(),
    amount: trade.sizeUsd,
    price: trade.price ?? 0,
    timestamp: trade.detectedAt,
    walletAddress: trade.traderAddress,
  };
}

// ── Page ─────────────────────────────────────────────

export default function Home() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [arbs, setArbs] = useState<ArbOpportunity[]>([]);
  const [movers, setMovers] = useState<MoverItem[]>([]);
  const [whales, setWhales] = useState<WhaleDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [statsRes, arbsRes, matchesRes, whalesRes] = await Promise.all([
          getStats(),
          getArbs({ limit: 10 }),
          getMatches({ limit: 10 }),
          getWhales({ limit: 10 }),
        ]);

        if (cancelled) return;

        setStats(statsRes);
        setArbs(arbsRes.arbs.map(arbToCard));
        setMovers(matchesRes.matches.map(matchToMover));
        setWhales(whalesRes.trades.map(whaleToDisplay));
        setError(null);
      } catch (err: any) {
        console.error("[Homepage] Failed to fetch data:", err);
        if (!cancelled) {
          setError(err.message ?? "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Hero skeleton */}
        <section className="py-6 space-y-3">
          <div className="h-10 w-3/4 bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-5 w-1/2 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-10 w-48 bg-emerald-500/20 rounded-lg animate-pulse mt-4" />
        </section>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 rounded-xl border border-white/[0.06] overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`p-4 bg-white/[0.02] ${i > 0 ? "border-l border-white/[0.06]" : ""}`}>
              <div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse mb-2" />
              <div className="h-8 w-20 bg-white/[0.08] rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
              <div className="h-4 w-3/4 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-12 bg-white/[0.04] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">Failed to load data: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Live — monitoring {(stats?.totalMarkets ?? 0).toLocaleString()} markets
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Find price gaps between<br className="hidden sm:block" /> prediction markets
        </h1>
        <p className="text-white/50 mt-3 text-lg max-w-2xl">
          Diverge monitors Polymarket & Kalshi in real-time, surfacing arbitrage opportunities the moment spreads appear.
        </p>
        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/arbs"
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition"
          >
            Explore Arb Opportunities →
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center px-5 py-2.5 rounded-lg border border-white/10 text-white/70 font-medium text-sm hover:bg-white/5 transition"
          >
            Compare Markets
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0 rounded-xl border border-white/[0.06] overflow-hidden">
        {[
          { label: "Total Markets", value: (stats?.totalMarkets ?? 0).toLocaleString(), icon: "📊" },
          { label: "Matched Markets", value: (stats?.totalMatched ?? 0).toLocaleString(), icon: "🔗" },
          { label: "Active Arbs", value: (stats?.activeArbs ?? 0).toString(), icon: "⚡", highlight: true },
          { label: "Avg Brier", value: stats?.avgBrierScore != null ? stats.avgBrierScore.toFixed(3) : "—", icon: "📐" },
          { label: "24h Volume", value: formatUsd(stats?.totalVolume24h ?? 0), icon: "💰" },
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

      {/* How It Works */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { step: "1", icon: "🔍", title: "Scan", desc: "We pull markets from Polymarket & Kalshi every minute and match identical events across platforms." },
          { step: "2", icon: "📊", title: "Compare", desc: "Our engine calculates real-time price spreads, adjusting for platform fees and liquidity." },
          { step: "3", icon: "⚡", title: "Alert", desc: "When spreads cross profitable thresholds, opportunities surface instantly on the dashboard." },
        ].map((item) => (
          <div key={item.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-semibold text-white/80">{item.title}</span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>

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
        {arbs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {arbs.slice(0, 6).map((arb) => (
              <ArbCard key={arb.id} arb={arb} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/30 text-sm">No active arb opportunities found.</div>
        )}

        {/* Pro CTA */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-white/50">
            See {Math.min(arbs.length, 6)} of {stats?.activeArbs ?? 0} active arbs. Unlock all with{" "}
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
              <span>📈</span> Biggest Spreads
            </h2>
            <Link href="/markets" className="text-sm text-emerald-400 hover:text-emerald-300 transition">
              All markets →
            </Link>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] divide-y divide-white/[0.06]">
            {movers.length > 0 ? movers.map((mover) => (
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
                  <div className="text-[10px] text-white/30">spread</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-white/30 text-sm">No matched markets found.</div>
            )}
          </div>
        </section>

        {/* Whale Trades */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>🐋</span> Whale Trades
            </h2>
            <span className="text-sm text-white/20">Coming Soon</span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] divide-y divide-white/[0.06]">
            {whales.length > 0 ? whales.slice(0, 6).map((trade) => (
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
                    {trade.walletAddress && trade.platform === "polymarket" ? (
                      <a
                        href={`https://polymarket.com/profile/${trade.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-white/20 font-mono hover:text-emerald-400 transition-colors"
                      >
                        {trade.walletAddress}
                      </a>
                    ) : trade.walletAddress ? (
                      <span className="text-[10px] text-white/20 font-mono">{trade.walletAddress}</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-bold">{formatUsd(trade.amount)}</div>
                  <div className="text-[10px] text-white/30">@ {Math.round(trade.price * 100)}¢</div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-white/30 text-sm">No whale trades found.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
