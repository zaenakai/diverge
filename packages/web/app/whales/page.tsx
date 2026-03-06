"use client";

import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/stat-card";
import { PlatformBadge } from "@/components/platform-badge";
import { Badge } from "@/components/ui/badge";
import { formatUsd, timeAgo, type Platform } from "@/lib/format";
import { getWhales, type WhaleTradeResult } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function truncateAddress(addr: string | null): string {
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WhalesPage() {
  const [trades, setTrades] = useState<WhaleTradeResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  async function fetchData(currentOffset: number, append = false) {
    try {
      const res = await getWhales({ limit, offset: currentOffset });
      if (append) {
        setTrades((prev) => [...prev, ...res.trades]);
      } else {
        setTrades(res.trades);
      }
      setTotal(res.total);
      setError(null);
    } catch (err: any) {
      console.error("[Whales] Failed to fetch:", err);
      if (!append) setError(err.message ?? "Failed to load whale trades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(0);
    const interval = setInterval(() => fetchData(0), 30_000);
    return () => clearInterval(interval);
  }, []);

  function handleLoadMore() {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchData(newOffset, true);
  }

  const stats = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recent = trades.filter(
      (t) => new Date(t.detectedAt).getTime() > oneDayAgo
    );
    const totalVolume = recent.reduce((sum, t) => sum + t.sizeUsd, 0);
    const largest =
      recent.length > 0 ? Math.max(...recent.map((t) => t.sizeUsd)) : 0;

    const marketCounts = new Map<string, number>();
    for (const t of recent) {
      const key = t.marketTitle || "Unknown";
      marketCounts.set(key, (marketCounts.get(key) || 0) + 1);
    }
    let mostActive = "—";
    let maxCount = 0;
    for (const [market, c] of marketCounts) {
      if (c > maxCount) {
        maxCount = c;
        mostActive = market.length > 40 ? market.slice(0, 37) + "…" : market;
      }
    }

    return {
      count: recent.length,
      volume: totalVolume,
      largest,
      mostActive,
    };
  }, [trades]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <div className="h-8 w-48 bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-white/[0.04] rounded animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="h-3 w-16 bg-white/[0.06] rounded animate-pulse mb-2" />
              <div className="h-8 w-20 bg-white/[0.08] rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-white/[0.04] rounded animate-pulse mb-2"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error && trades.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">
            Failed to load whale trades: {error}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              fetchData(0);
            }}
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🐋 Whale Trades
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Large trades ($10K+) across Polymarket and Kalshi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400 font-medium">
            Live — refreshes every 30s
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Whale Trades (24h)"
          value={stats.count.toString()}
          icon="🐋"
        />
        <StatCard
          label="Whale Volume (24h)"
          value={stats.volume > 0 ? formatUsd(stats.volume) : "$0"}
          highlight
          icon="💰"
        />
        <StatCard
          label="Largest Trade (24h)"
          value={stats.largest > 0 ? formatUsd(stats.largest) : "$0"}
          icon="💎"
        />
        <StatCard
          label="Most Active Market"
          value={stats.mostActive}
          icon="🔥"
        />
      </div>

      {/* Table or Empty State */}
      {trades.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <div className="text-4xl mb-4">🐋</div>
          <h3 className="text-lg font-medium text-white/70 mb-2">
            No whale trades detected yet
          </h3>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            Whale tracking monitors trades over $10,000 across all platforms.
            When large trades happen, they&apos;ll appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white/60">
              Recent Whale Trades
            </h2>
            <Badge
              variant="outline"
              className="border-white/10 text-white/30 text-[10px]"
            >
              {total} total
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/40 text-xs">Time</TableHead>
                  <TableHead className="text-white/40 text-xs">
                    Market
                  </TableHead>
                  <TableHead className="text-white/40 text-xs text-center">
                    Platform
                  </TableHead>
                  <TableHead className="text-white/40 text-xs text-center">
                    Side
                  </TableHead>
                  <TableHead className="text-white/40 text-xs text-right">
                    Size
                  </TableHead>
                  <TableHead className="text-white/40 text-xs text-right">
                    Price
                  </TableHead>
                  <TableHead className="text-white/40 text-xs">
                    Trader
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow
                    key={trade.id}
                    className="border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-white/50 whitespace-nowrap">
                      {timeAgo(trade.detectedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-white/80 max-w-[280px]">
                      <span className="truncate block">
                        {trade.marketTitle}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <PlatformBadge
                        platform={trade.platform as Platform}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          trade.side === "buy"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {trade.side === "buy" ? "Buy" : "Sell"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold text-white">
                      {formatUsd(trade.sizeUsd)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-white/50">
                      {trade.price
                        ? `${Math.round(trade.price * 100)}¢`
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white/40">
                      {truncateAddress(trade.traderAddress)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Load More */}
          {trades.length < total && (
            <div className="px-4 py-3 border-t border-white/5 text-center">
              <button
                onClick={handleLoadMore}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Load more ({total - trades.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
