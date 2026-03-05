"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { ArbCard } from "@/components/arb-card";
import { PlatformBadge } from "@/components/platform-badge";
import { Badge } from "@/components/ui/badge";
import { formatUsd, categoryColors, type ArbOpportunity, type Platform } from "@/lib/format";
import { getArbs, type ArbResult } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Transform API arb → local ArbOpportunity ────────

function arbToLocal(arb: ArbResult): ArbOpportunity {
  const priceA = arb.marketA.yesPrice ?? 0;
  const priceB = arb.marketB.yesPrice ?? 0;
  const buyPlatform = (arb.buyPlatform ?? arb.marketA.platform.slug) as Platform;
  const sellPlatform = buyPlatform === "polymarket" ? "kalshi" : "polymarket";
  const rawSpread = arb.spreadRaw ? Math.abs(arb.spreadRaw) * 100 : Math.abs(priceA - priceB) * 100;
  const adjustedSpread = arb.spreadAdjusted ? Math.abs(arb.spreadAdjusted) * 100 : rawSpread * 0.85;

    // Show time until earliest market resolution (not time since detected)
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
    volume: (arb.marketA.volume24h ?? 0) + (arb.marketB.volume24h ?? 0),
    trend: "stable",
    timeOpen: diffMins < 0 ? "—" : days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`,
  };
}

// ─── Sort helpers ────────────────────────────────────────────────────────────

type SortColumn = "title" | "platforms" | "rawSpread" | "adjustedSpread" | "volume" | "trend" | "timeOpen";
type SortDirection = "asc" | "desc";

function parseDuration(t: string): number {
  let mins = 0;
  const hMatch = t.match(/(\d+)h/);
  const mMatch = t.match(/(\d+)m/);
  if (hMatch) mins += parseInt(hMatch[1]) * 60;
  if (mMatch) mins += parseInt(mMatch[1]);
  return mins;
}

function getSortValue(arb: ArbOpportunity, col: SortColumn): number | string {
  switch (col) {
    case "title": return arb.title.toLowerCase();
    case "platforms": return `${arb.buyPlatform}-${arb.sellPlatform}`;
    case "rawSpread": return arb.rawSpread;
    case "adjustedSpread": return arb.adjustedSpread;
    case "volume": return arb.volume;
    case "trend": return arb.trend === "widening" ? 2 : arb.trend === "stable" ? 1 : 0;
    case "timeOpen": return parseDuration(arb.timeOpen);
  }
}

// ─── Filter types ────────────────────────────────────────────────────────────

type CategoryFilter = "all" | string;
type SpreadFilter = "all" | "1" | "2" | "3" | "5";
type DirectionFilter = "all" | "buy-polymarket" | "buy-kalshi";

// ─── Spread color helpers ────────────────────────────────────────────────────

function getSpreadColor(spread: number): string {
  if (spread >= 5) return "text-emerald-400";
  if (spread >= 3) return "text-yellow-400";
  return "text-white/50";
}

function getRowBorder(spread: number): string {
  if (spread >= 5) return "border-l-2 border-l-emerald-500";
  if (spread >= 3) return "border-l-2 border-l-yellow-500";
  return "border-l-2 border-l-transparent";
}

// ─── Trend indicator component ───────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: "widening" | "narrowing" | "stable" }) {
  if (trend === "widening") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400" />
        </span>
        <span className="text-xs font-bold text-red-400">↑ widening</span>
      </span>
    );
  }
  if (trend === "narrowing") {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-40" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400" />
        </span>
        <span className="text-xs font-bold text-yellow-400">↓ narrowing</span>
      </span>
    );
  }
  return (
    <span className="text-xs text-white/30">→ stable</span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ArbsPage() {
  const [allArbs, setAllArbs] = useState<ArbOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>("adjustedSpread");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [spreadFilter, setSpreadFilter] = useState<SpreadFilter>("all");
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>("all");

  // Fetch arbs
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await getArbs({ limit: 100 });
        if (cancelled) return;

        setAllArbs(res.arbs.map(arbToLocal));
        setError(null);
      } catch (err: any) {
        console.error("[Arbs] Failed to fetch data:", err);
        if (!cancelled) {
          setError(err.message ?? "Failed to load arbs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Stats
  const arbsOver1 = allArbs.filter((a) => a.adjustedSpread > 1).length;
  const arbsOver2 = allArbs.filter((a) => a.adjustedSpread > 2).length;
  const arbsOver5 = allArbs.filter((a) => a.adjustedSpread > 5).length;

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function SortArrow({ column }: { column: SortColumn }) {
    if (sortColumn !== column) return <span className="text-white/20 ml-1">↕</span>;
    return <span className="text-emerald-400 ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>;
  }

  // Filtered + sorted data
  const { filteredArbs, totalCount } = useMemo(() => {
    let result = [...allArbs];

    // Category
    if (categoryFilter !== "all") {
      result = result.filter((a) => a.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Min spread
    if (spreadFilter !== "all") {
      const min = parseInt(spreadFilter);
      result = result.filter((a) => a.adjustedSpread > min);
    }

    // Direction
    if (directionFilter === "buy-polymarket") {
      result = result.filter((a) => a.buyPlatform === "polymarket");
    } else if (directionFilter === "buy-kalshi") {
      result = result.filter((a) => a.buyPlatform === "kalshi");
    }

    // Sort
    result.sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      const cmp =
        typeof aVal === "string" && typeof bVal === "string"
          ? aVal.localeCompare(bVal)
          : (aVal as number) - (bVal as number);
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return { filteredArbs: result, totalCount: allArbs.length };
  }, [allArbs, categoryFilter, spreadFilter, directionFilter, sortColumn, sortDirection]);

  const visibleArbs = filteredArbs.slice(0, 5);
  const blurredArbs = filteredArbs.slice(5, 8);

  // Filter pill helper
  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
      active
        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
        : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:border-white/20"
    }`;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <div className="h-8 w-48 bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-white/[0.04] rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse mb-2" />
              <div className="h-8 w-20 bg-white/[0.08] rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
              <div className="h-4 w-3/4 bg-white/[0.06] rounded animate-pulse" />
              <div className="h-16 bg-white/[0.04] rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-white/[0.04] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && allArbs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">Failed to load arbs: {error}</p>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">⚡ Arb Scanner</h1>
          <p className="text-sm text-white/40 mt-1">Real-time cross-platform arbitrage opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Active > 1%" value={arbsOver1.toString()} icon="📊" />
        <StatCard label="Active > 2%" value={arbsOver2.toString()} highlight icon="🔥" />
        <StatCard label="Active > 5%" value={arbsOver5.toString()} icon="💎" />
      </div>

      {/* Top Arb Cards */}
      {allArbs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allArbs.slice(0, 3).map((arb) => (
            <ArbCard key={arb.id} arb={arb} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-white/30 text-sm">No active arb opportunities found.</div>
      )}

      {/* ── Inline Teaser CTA ── */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <p className="text-sm text-white/50">
            Free users see top 5 arbs with 15-min delay. Upgrade for real-time access to all opportunities.
          </p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold mr-1.5">
            Pro
          </span>
          Upgrade to Pro →
        </Link>
      </div>

      {/* ── Filter Bar ── */}
      <div className="space-y-3">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          {(["all", "politics", "crypto", "sports", "economics", "science"] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={pillClass(categoryFilter === cat)}
            >
              {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Second row: spread, direction */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Min spread */}
          <span className="text-xs text-white/30 mr-1">Min spread:</span>
          {(["all", "1", "2", "3", "5"] as SpreadFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setSpreadFilter(s)}
              className={pillClass(spreadFilter === s)}
            >
              {s === "all" ? "Any" : `>${s}%`}
            </button>
          ))}

          <span className="w-px h-5 bg-white/10 mx-2" />

          {/* Direction */}
          <span className="text-xs text-white/30 mr-1">Direction:</span>
          {([
            ["all", "All"],
            ["buy-polymarket", "Buy Polymarket"],
            ["buy-kalshi", "Buy Kalshi"],
          ] as [DirectionFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDirectionFilter(val)}
              className={pillClass(directionFilter === val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="text-xs text-white/30">
          Showing {filteredArbs.length} of {totalCount} opportunities
        </div>
      </div>

      {/* ── Full Arb Table ── */}
      {filteredArbs.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/60">All Active Opportunities</h2>
            <Badge variant="outline" className="border-white/10 text-white/30 text-[10px]">
              {filteredArbs.length} active
            </Badge>
          </div>
          <div className="overflow-x-auto relative">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead
                    className="text-white/40 text-xs cursor-pointer hover:text-white/70 transition-colors select-none"
                    onClick={() => handleSort("title")}
                  >
                    Market <SortArrow column="title" />
                  </TableHead>
                  <TableHead
                    className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                    onClick={() => handleSort("platforms")}
                  >
                    Platforms <SortArrow column="platforms" />
                  </TableHead>
                  <TableHead
                    className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                    onClick={() => handleSort("rawSpread")}
                  >
                    Raw Spread <SortArrow column="rawSpread" />
                  </TableHead>
                  <TableHead
                    className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                    onClick={() => handleSort("adjustedSpread")}
                  >
                    Net Spread <SortArrow column="adjustedSpread" />
                  </TableHead>
                  <TableHead
                    className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                    onClick={() => handleSort("volume")}
                  >
                    Volume <SortArrow column="volume" />
                  </TableHead>
                  <TableHead
                    className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                    onClick={() => handleSort("trend")}
                  >
                    Trend <SortArrow column="trend" />
                  </TableHead>
                  <TableHead
                    className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                    onClick={() => handleSort("timeOpen")}
                  >
                    Expires <SortArrow column="timeOpen" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Visible rows */}
                {visibleArbs.map((arb) => (
                  <TableRow
                    key={arb.id}
                    className={`border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors ${getRowBorder(arb.rawSpread)}`}
                  >
                    <TableCell className="font-medium text-sm text-white/80 max-w-[180px]">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1 py-0.5 rounded border shrink-0 ${categoryColors[arb.category] ?? categoryColors["Other"]}`}>
                          {arb.category}
                        </span>
                        <span className="truncate">{arb.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-[10px] text-white/30">Buy</span>
                        <PlatformBadge platform={arb.buyPlatform} />
                        <span className="font-mono text-xs">{Math.round(arb.buyPrice * 100)}¢</span>
                        <span className="text-white/20 mx-0.5">→</span>
                        <span className="text-[10px] text-white/30">Sell</span>
                        <PlatformBadge platform={arb.sellPlatform} />
                        <span className="font-mono text-xs">{Math.round(arb.sellPrice * 100)}¢</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm font-bold ${getSpreadColor(arb.rawSpread)}`}>
                        {arb.rawSpread.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm ${getSpreadColor(arb.adjustedSpread)}`}>
                        {arb.adjustedSpread.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-white/50">
                      {formatUsd(arb.volume)}
                    </TableCell>
                    <TableCell className="text-center">
                      <TrendIndicator trend={arb.trend} />
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-white/50">
                      {arb.timeOpen}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Blurred rows */}
                {blurredArbs.length > 0 && (
                  <>
                    {blurredArbs.map((arb) => (
                      <TableRow
                        key={arb.id}
                        className={`border-white/5 transition-colors ${getRowBorder(arb.rawSpread)}`}
                        style={{ filter: "blur(4px)", pointerEvents: "none" }}
                      >
                        <TableCell className="font-medium text-sm text-white/80 max-w-[180px]">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-1 py-0.5 rounded border shrink-0 ${categoryColors[arb.category] ?? categoryColors["Other"]}`}>
                              {arb.category}
                            </span>
                            <span className="truncate">{arb.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <PlatformBadge platform={arb.buyPlatform} />
                            <span className="text-white/20 mx-0.5">→</span>
                            <PlatformBadge platform={arb.sellPlatform} />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-sm font-bold text-white/50">{arb.rawSpread.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-sm text-white/50">{arb.adjustedSpread.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs text-white/50">{formatUsd(arb.volume)}</TableCell>
                        <TableCell className="text-center text-xs text-white/30">{arb.trend}</TableCell>
                        <TableCell className="text-center font-mono text-xs text-white/50">{arb.timeOpen}</TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>

            {/* Blur overlay */}
            {blurredArbs.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-32 flex items-center justify-center bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent">
                <div className="text-center">
                  <div className="text-lg mb-1">🔒</div>
                  <p className="text-sm text-white/60 mb-2">Upgrade to see all opportunities</p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
                  >
                    Unlock All Arbs →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Pro Pricing Section ── */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4">
              ✨ Diverge Pro
            </span>
            <h3 className="text-xl font-bold text-white mt-3">
              Stop missing profitable opportunities
            </h3>
            <p className="text-sm text-white/40 mt-2 max-w-lg mx-auto">
              Free users see the top 5 arbs with a 15-minute delay. Pro unlocks everything in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-2xl mb-2">⚡</div>
              <div className="text-sm font-medium text-white/80">Real-time data</div>
              <div className="text-xs text-white/30 mt-1">No 15-min delay. See arbs the moment they appear.</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-2xl mb-2">🔔</div>
              <div className="text-sm font-medium text-white/80">Push alerts</div>
              <div className="text-xs text-white/30 mt-1">Get notified when spreads cross your threshold.</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium text-white/80">Full history</div>
              <div className="text-xs text-white/30 mt-1">90-day backtests, spread history, and P&L tracking.</div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition"
            >
              Upgrade to Pro — $25/mo
            </Link>
            <p className="text-xs text-white/20 mt-2">Cancel anytime. 7-day money-back guarantee.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
