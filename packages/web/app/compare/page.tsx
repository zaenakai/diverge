"use client";

import { useState, useMemo } from "react";
import { StatCard } from "@/components/stat-card";
import { PlatformBadge } from "@/components/platform-badge";
import { PriceChart } from "@/components/price-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  matchedMarkets,
  platformStats,
  formatUsd,
  categoryColors,
  type MatchedMarket,
} from "@/lib/mock-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortColumn = "title" | "polymarketYes" | "kalshiYes" | "spread" | "volume" | "matchConfidence";
type SortDirection = "asc" | "desc";

function getSortValue(market: MatchedMarket, column: SortColumn): number | string {
  switch (column) {
    case "title": return market.title.toLowerCase();
    case "polymarketYes": return market.polymarketYes;
    case "kalshiYes": return market.kalshiYes;
    case "spread": return market.spread;
    case "volume": return market.polyVolume24h + market.kalshiVolume24h;
    case "matchConfidence": return market.matchConfidence;
  }
}

export default function ComparePage() {
  const [sortColumn, setSortColumn] = useState<SortColumn>("spread");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedMarkets = useMemo(() => {
    return [...matchedMarkets].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      const cmp = typeof aVal === "string" && typeof bVal === "string"
        ? aVal.localeCompare(bVal)
        : (aVal as number) - (bVal as number);
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [sortColumn, sortDirection]);

  const [selected, setSelected] = useState<MatchedMarket | null>(() => {
    // Default: select first row by spread descending
    const sorted = [...matchedMarkets].sort((a, b) => b.spread - a.spread);
    return sorted[0] ?? null;
  });

  const [hoveredBar, setHoveredBar] = useState<{ index: number; spread: number; date: string } | null>(null);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function SortArrow({ column }: { column: SortColumn }) {
    if (sortColumn !== column) return <span className="text-white/20 ml-1">↕</span>;
    return <span className="text-emerald-400 ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Cross-Platform Compare</h1>
        <p className="text-sm text-white/40 mt-1">
          Side-by-side analysis of matched markets across Polymarket & Kalshi
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Matched" value={platformStats.matchedMarkets.toLocaleString()} icon="🔗" />
        <StatCard label="Avg Spread" value={`${platformStats.avgSpread}%`} icon="📐" />
        <StatCard label="Spread > 2%" value={platformStats.marketsWithSpreadOver2.toString()} highlight icon="⚡" />
      </div>

      {/* Matched Markets Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
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
                  onClick={() => handleSort("polymarketYes")}
                >
                  <span className="text-blue-400">Polymarket</span> <SortArrow column="polymarketYes" />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleSort("kalshiYes")}
                >
                  <span className="text-orange-400">Kalshi</span> <SortArrow column="kalshiYes" />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleSort("spread")}
                >
                  Spread <SortArrow column="spread" />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleSort("volume")}
                >
                  Volume <SortArrow column="volume" />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleSort("matchConfidence")}
                >
                  Confidence <SortArrow column="matchConfidence" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMarkets.map((market) => {
                const isSelected = selected?.id === market.id;
                return (
                  <TableRow
                    key={market.id}
                    className={`border-white/5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-500/5 border-l-2 border-l-emerald-500"
                        : "hover:bg-white/[0.02]"
                    }`}
                    onClick={() => setSelected(isSelected ? null : market)}
                  >
                    <TableCell className="font-medium text-sm text-white/80 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1 py-0.5 rounded border ${categoryColors[market.category]}`}>
                          {market.category}
                        </span>
                        <span className="truncate">{market.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm font-bold text-blue-400">
                        {Math.round(market.polymarketYes * 100)}¢
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm font-bold text-orange-400">
                        {Math.round(market.kalshiYes * 100)}¢
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm font-bold ${
                        market.spread >= 5 ? "text-emerald-400" : market.spread >= 3 ? "text-yellow-400" : "text-white/50"
                      }`}>
                        {market.spread.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-white/50">
                        <span className="text-blue-400 font-mono">{formatUsd(market.polyVolume24h)}</span>
                        <span className="text-white/20">/</span>
                        <span className="text-orange-400 font-mono">{formatUsd(market.kalshiVolume24h)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          market.matchConfidence >= 0.95
                            ? "border-emerald-500/30 text-emerald-400"
                            : market.matchConfidence >= 0.9
                            ? "border-yellow-500/30 text-yellow-400"
                            : "border-white/20 text-white/40"
                        }`}
                      >
                        {Math.round(market.matchConfidence * 100)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selected.title}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm">
                  <span className="text-blue-400 font-mono font-bold">{Math.round(selected.polymarketYes * 100)}¢</span>
                  <span className="text-white/30 mx-2">vs</span>
                  <span className="text-orange-400 font-mono font-bold">{Math.round(selected.kalshiYes * 100)}¢</span>
                </span>
                <span className={`text-sm font-mono font-bold ${
                  selected.spread >= 5 ? "text-emerald-400" : "text-yellow-400"
                }`}>
                  {selected.spread.toFixed(1)}% spread
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-white/30 hover:text-white transition text-sm"
            >
              ✕ Close
            </button>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-white/60 mb-3">Price Comparison (30d)</h4>
              <div className="rounded-lg border border-white/10 bg-white/[0.01] p-3">
                <PriceChart
                  polyData={selected.priceHistory.map(p => ({ date: p.date, value: p.poly }))}
                  kalshiData={selected.priceHistory.map(p => ({ date: p.date, value: p.kalshi }))}
                  height={250}
                />
              </div>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-blue-400 rounded-full" /> Polymarket
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-orange-400 rounded-full" /> Kalshi
                </span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-white/60 mb-3">Volume Comparison (24h)</h4>
              <div className="rounded-lg border border-white/10 bg-white/[0.01] p-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <PlatformBadge platform="polymarket" />
                      <span className="font-mono text-blue-400">{formatUsd(selected.polyVolume24h)}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-3">
                      <div
                        className="bg-blue-400/60 h-3 rounded-full transition-all"
                        style={{
                          width: `${(selected.polyVolume24h / (selected.polyVolume24h + selected.kalshiVolume24h)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <PlatformBadge platform="kalshi" />
                      <span className="font-mono text-orange-400">{formatUsd(selected.kalshiVolume24h)}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-3">
                      <div
                        className="bg-orange-400/60 h-3 rounded-full transition-all"
                        style={{
                          width: `${(selected.kalshiVolume24h / (selected.polyVolume24h + selected.kalshiVolume24h)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Spread History mini with tooltip */}
                <div className="mt-6 pt-4 border-t border-white/5">
                  <h5 className="text-xs text-white/40 mb-2">Spread History (30d)</h5>
                  <div className="relative flex items-end gap-px h-16">
                    {selected.spreadHistory.map((s, i) => (
                      <div
                        key={i}
                        className={`relative flex-1 rounded-t-sm transition-all cursor-crosshair ${
                          hoveredBar?.index === i
                            ? "bg-emerald-500/60"
                            : "bg-emerald-500/30 hover:bg-emerald-500/50"
                        }`}
                        style={{ height: `${Math.min(100, s.spread * 10)}%` }}
                        onMouseEnter={() => setHoveredBar({ index: i, spread: s.spread, date: s.date })}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {hoveredBar?.index === i && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded text-[10px] text-white whitespace-nowrap z-10 pointer-events-none shadow-lg">
                            <div className="font-mono font-bold text-emerald-400">{s.spread.toFixed(1)}%</div>
                            <div className="text-white/40">{s.date}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trade Action Buttons */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              variant="outline"
              asChild
              className="border-blue-400/40 text-blue-400 hover:bg-blue-400/10 hover:text-blue-300 hover:border-blue-400/60"
            >
              <a href="#" target="_blank" rel="noopener noreferrer">
                Trade on Polymarket →
              </a>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-orange-400/40 text-orange-400 hover:bg-orange-400/10 hover:text-orange-300 hover:border-orange-400/60"
            >
              <a href="#" target="_blank" rel="noopener noreferrer">
                Trade on Kalshi →
              </a>
            </Button>
          </div>

          {/* Pro CTA */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">📊</span>
              <p className="text-sm text-white/50">
                Historical spread data limited to 7 days on Free. Get 90-day history with{" "}
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold mx-0.5">
                  Pro
                </span>
              </p>
            </div>
            <a
              href="/pricing"
              className="shrink-0 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Upgrade to Pro →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
