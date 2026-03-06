"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { formatUsd, categoryColors, type ExplorerMarket, type Platform } from "@/lib/format";
import { useTier } from "@/hooks/use-tier";
import { InlineUpgradeBanner } from "@/components/upgrade-gate";
import {
  getMarkets,
  getMatches,
  type ApiMarket,
  type MatchedMarketPair,
} from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type FilterType = "all" | "cross-platform" | "polymarket-only" | "kalshi-only" | string;
type SortType = "volume" | "spread" | "closing" | "change";

const DEFAULT_FILTER: FilterType = "cross-platform";

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "cross-platform", label: "Cross-Platform" },
  { value: "polymarket-only", label: "Polymarket Only" },
  { value: "kalshi-only", label: "Kalshi Only" },
  { value: "politics", label: "Politics" },
  { value: "crypto", label: "Crypto" },
  { value: "sports", label: "Sports" },
  { value: "economics", label: "Economics" },
  { value: "science", label: "Science" },
];

const sortOptions: { value: SortType; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "spread", label: "Spread" },
  { value: "closing", label: "Closing Soon" },
  { value: "change", label: "Price Change" },
];

function formatPercent(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

function apiMarketToExplorer(market: ApiMarket): ExplorerMarket {
  return {
    id: String(market.id),
    title: market.title,
    category: market.category ?? "Other",
    matched: false,
    platform: market.platform.slug as Platform,
    url: market.url,
    yesPrice: market.yesPrice ?? 0,
    change24h: 0,
    volume24h: market.volume24h ?? 0,
    totalVolume: market.volume24h ?? 0,
    endDate: market.resolutionDate ?? "",
  };
}

function matchToExplorer(match: MatchedMarketPair): ExplorerMarket {
  const isAPolymarket = match.marketA.platform.slug === "polymarket";
  const polyMarket = isAPolymarket ? match.marketA : match.marketB;
  const kalshiMarket = isAPolymarket ? match.marketB : match.marketA;

  return {
    id: `match-${match.id}`,
    title: polyMarket.title || kalshiMarket.title,
    category: polyMarket.category ?? kalshiMarket.category ?? "Other",
    matched: true,
    polymarketPrice: polyMarket.yesPrice ?? undefined,
    kalshiPrice: kalshiMarket.yesPrice ?? undefined,
    spread: match.spread,
    polyVolume24h: polyMarket.volume24h ?? undefined,
    kalshiVolume24h: kalshiMarket.volume24h ?? undefined,
    change24h: 0,
    volume24h: (polyMarket.volume24h ?? 0) + (kalshiMarket.volume24h ?? 0),
    totalVolume: (polyMarket.volume24h ?? 0) + (kalshiMarket.volume24h ?? 0),
    endDate: polyMarket.resolutionDate ?? kalshiMarket.resolutionDate ?? "",
  };
}

function MatchedCard({ market }: { market: ExplorerMarket }) {
  return (
    <Link href={`/compare?market=${market.id}`} className="block">
      <div className="rounded-xl border border-white/[0.06] border-l-2 border-l-emerald-500/30 bg-white/[0.03] p-4 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-pointer group">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-blue-400/30 bg-blue-400/10 text-blue-400 font-medium">Polymarket</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-orange-400/30 bg-orange-400/10 text-orange-400 font-medium">Kalshi</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${categoryColors[market.category] ?? categoryColors["Other"]}`}>{market.category}</span>
        </div>
        <h3 className="text-sm font-medium leading-tight text-white/90 group-hover:text-white transition-colors line-clamp-2 mb-3">{market.title}</h3>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1 rounded-lg bg-blue-400/[0.06] border border-blue-400/10 px-3 py-2 text-center">
            <div className="text-[10px] text-blue-400/60 uppercase tracking-wide">Polymarket</div>
            <div className="text-lg font-mono font-bold text-blue-400">{market.polymarketPrice != null ? formatPercent(market.polymarketPrice) : "—"}</div>
          </div>
          <div className="flex-1 rounded-lg bg-orange-400/[0.06] border border-orange-400/10 px-3 py-2 text-center">
            <div className="text-[10px] text-orange-400/60 uppercase tracking-wide">Kalshi</div>
            <div className="text-lg font-mono font-bold text-orange-400">{market.kalshiPrice != null ? formatPercent(market.kalshiPrice) : "—"}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-emerald-500">{(market.spread ?? 0).toFixed(1)}% spread</span>
            <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500/60" style={{ width: `${Math.min((market.spread ?? 0) * 10, 100)}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
          <div className="text-[10px] text-white/30">{formatUsd(market.volume24h)} combined 24h vol</div>
          <span className="text-xs text-emerald-400 group-hover:text-emerald-300 transition-colors font-medium">Compare →</span>
        </div>
      </div>
    </Link>
  );
}

function SingleCard({ market }: { market: ExplorerMarket }) {
  const isPolymarket = market.platform === "polymarket";
  const changePositive = market.change24h >= 0;

  return (
    <a href={market.url ?? "#"} target={market.url ? "_blank" : undefined} rel={market.url ? "noopener noreferrer" : undefined} className="block">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-pointer group">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {isPolymarket ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-blue-400/30 bg-blue-400/10 text-blue-400 font-medium">Polymarket</span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-orange-400/30 bg-orange-400/10 text-orange-400 font-medium">Kalshi</span>
          )}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${categoryColors[market.category] ?? categoryColors["Other"]}`}>{market.category}</span>
        </div>
        <h3 className="text-sm font-medium leading-tight text-white/90 group-hover:text-white transition-colors line-clamp-2 mb-3">{market.title}</h3>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] text-white/30 uppercase">Yes</div>
            <div className={`text-lg font-mono font-bold ${isPolymarket ? "text-blue-400" : "text-orange-400"}`}>{formatPercent(market.yesPrice!)}</div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-mono font-medium flex items-center justify-end gap-0.5 ${changePositive ? "text-emerald-400" : "text-red-400"}`}>
              <span>{changePositive ? "↑" : "↓"}</span>
              <span>{changePositive ? "+" : ""}{market.change24h.toFixed(1)}%</span>
            </div>
            <div className="text-[10px] text-white/30">24h change</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
          <div className="text-[10px] text-white/30">{formatUsd(market.volume24h)} 24h vol</div>
          <span className={`text-xs font-medium transition-colors ${isPolymarket ? "text-blue-400/60 group-hover:text-blue-400" : "text-orange-400/60 group-hover:text-orange-400"}`}>View →</span>
        </div>
      </div>
    </a>
  );
}

export default function MarketsPage() {
  const { limits, isFree, isPro } = useTier();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>(DEFAULT_FILTER);
  const [sort, setSort] = useState<SortType>("volume");
  const [allMarkets, setAllMarkets] = useState<ExplorerMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const PAGE_SIZE = 60;

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [marketsRes, matchesRes] = await Promise.all([
          getMarkets({ limit: PAGE_SIZE, offset: 0 }),
          getMatches({ limit: 200 }),
        ]);
        if (cancelled) return;
        const matchedMarketIds = new Set<number>();
        const matchedExplorer: ExplorerMarket[] = [];
        for (const match of matchesRes.matches) {
          matchedMarketIds.add(match.marketA.id);
          matchedMarketIds.add(match.marketB.id);
          matchedExplorer.push(matchToExplorer(match));
        }
        const singleExplorer: ExplorerMarket[] = marketsRes.markets
          .filter((m) => !matchedMarketIds.has(m.id))
          .map(apiMarketToExplorer);
        setAllMarkets([...matchedExplorer, ...singleExplorer]);
        setOffset(PAGE_SIZE);
        setHasMore(marketsRes.markets.length >= PAGE_SIZE);
        setError(null);
      } catch (err: any) {
        console.error("[Markets] Failed to fetch data:", err);
        if (!cancelled) setError(err.message ?? "Failed to load markets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await getMarkets({ limit: PAGE_SIZE, offset });
      const newMarkets = res.markets.map(apiMarketToExplorer);
      setAllMarkets((prev) => [...prev, ...newMarkets]);
      setOffset((prev) => prev + PAGE_SIZE);
      setHasMore(res.markets.length >= PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load more:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  const { matchedMarkets, singleMarkets, totalCount, filteredCount } = useMemo(() => {
    let result = allMarkets;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }
    if (filter === "cross-platform") result = result.filter((m) => m.matched);
    else if (filter === "polymarket-only") result = result.filter((m) => !m.matched && m.platform === "polymarket");
    else if (filter === "kalshi-only") result = result.filter((m) => !m.matched && m.platform === "kalshi");
    else if (filter !== "all" && ["politics", "crypto", "sports", "economics", "entertainment", "science"].includes(filter))
      result = result.filter((m) => m.category?.toLowerCase() === filter.toLowerCase());

    const sorted = [...result];
    switch (sort) {
      case "volume": sorted.sort((a, b) => b.volume24h - a.volume24h); break;
      case "spread": sorted.sort((a, b) => (b.spread ?? 0) - (a.spread ?? 0)); break;
      case "closing": sorted.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()); break;
      case "change": sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)); break;
    }

    // Apply tier-based limit
    const maxPerPage = limits.marketsPerPage;
    const limited = maxPerPage === Infinity ? sorted : sorted.slice(0, maxPerPage as number);

    const matched = limited.filter((m) => m.matched);
    const single = limited.filter((m) => !m.matched);

    return {
      matchedMarkets: matched,
      singleMarkets: single,
      totalCount: allMarkets.length,
      filteredCount: limited.length,
    };
  }, [allMarkets, search, filter, sort, limits.marketsPerPage]);

  const exportCsv = useCallback(() => {
    const allFiltered = [...matchedMarkets, ...singleMarkets];
    const headers = ["Title", "Category", "Platform", "Price", "Volume 24h", "Spread"];
    const rows = allFiltered.map((m) => [
      `"${m.title.replace(/"/g, '""')}"`,
      m.category,
      m.matched ? "Cross-Platform" : m.platform ?? "",
      m.matched ? `Poly:${m.polymarketPrice ?? ""} Kalshi:${m.kalshiPrice ?? ""}` : String(m.yesPrice ?? ""),
      String(m.volume24h),
      String(m.spread ?? ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diverge-markets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [matchedMarkets, singleMarkets]);

  const showBothSections = filter === "all" || ["politics", "crypto", "sports", "economics", "entertainment", "science"].includes(filter);
  const showMatched = showBothSections || filter === "cross-platform";
  const showSingle = showBothSections || filter === "polymarket-only" || filter === "kalshi-only";

  if (error && allMarkets.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">Failed to load markets: {error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Markets Explorer</h1>
          <p className="text-sm text-white/40 mt-1">Compare prediction markets across Polymarket & Kalshi</p>
        </div>
        <div className="flex items-center gap-3">
          {limits.exportData && (
            <Button
              onClick={exportCsv}
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white"
            >
              📥 Export CSV
            </Button>
          )}
          {loading && <span className="text-[10px] text-white/30 animate-pulse">Loading markets...</span>}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input placeholder="Search markets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white">
              Sort: {sortOptions.find((s) => s.value === sort)?.label}
              <svg className="ml-2 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1a] border-white/10">
            {sortOptions.map((opt) => (
              <DropdownMenuItem key={opt.value} onClick={() => setSort(opt.value)} className="text-white/70 hover:text-white focus:text-white focus:bg-white/10">
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === f.value ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:border-white/20"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-white/30">
        Showing {filteredCount} of {totalCount} markets
        {isFree && limits.marketsPerPage !== Infinity && (
          <span className="text-emerald-400/60 ml-1">
            · Limited to {limits.marketsPerPage} per page · <Link href="/pricing" className="hover:text-emerald-400">Upgrade for more</Link>
          </span>
        )}
      </div>

      {showMatched && matchedMarkets.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400/70">Cross-Platform Markets</h2>
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-white/20">{matchedMarkets.length} matched</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchedMarkets.map((market) => <MatchedCard key={market.id} market={market} />)}
          </div>
        </section>
      )}

      {showSingle && singleMarkets.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3 mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/30">Single Platform Only</h2>
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-white/20">{singleMarkets.length} markets</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {singleMarkets.map((market) => <SingleCard key={market.id} market={market} />)}
          </div>
        </section>
      )}

      {matchedMarkets.length === 0 && singleMarkets.length === 0 && !loading && (
        <div className="text-center py-16 text-white/30 text-sm">No markets match your search.</div>
      )}

      {hasMore && !loading && filter === "all" && !search && limits.marketsPerPage === Infinity && (
        <div className="flex justify-center pt-2">
          <Button onClick={loadMore} disabled={loadingMore} variant="outline" className="border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06] hover:text-white px-8">
            {loadingMore ? "Loading..." : "Load More Markets"}
          </Button>
        </div>
      )}

      {isFree && (
        <InlineUpgradeBanner
          requiredTier="pro"
          message="Free users see 20 markets per page. Upgrade for up to 100 markets and CSV export."
        />
      )}
      {isPro && !limits.exportData && (
        <InlineUpgradeBanner
          requiredTier="enterprise"
          message="Upgrade to Enterprise for unlimited markets and advanced export options."
        />
      )}
    </div>
  );
}
