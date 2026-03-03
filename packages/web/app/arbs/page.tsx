"use client";

import { StatCard } from "@/components/stat-card";
import { ArbCard } from "@/components/arb-card";
import { PlatformBadge } from "@/components/platform-badge";
import { Badge } from "@/components/ui/badge";
import {
  arbOpportunities,
  arbHistoricalPerformance,
  formatUsd,
  categoryColors,
} from "@/lib/mock-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

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

export default function ArbsPage() {
  const arbsOver1 = arbOpportunities.filter((a) => a.adjustedSpread > 1).length;
  const arbsOver2 = arbOpportunities.filter((a) => a.adjustedSpread > 2).length;
  const arbsOver5 = arbOpportunities.filter((a) => a.adjustedSpread > 5).length;
  const lastPerf = arbHistoricalPerformance[arbHistoricalPerformance.length - 1];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            ⚡ Arb Scanner
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Real-time cross-platform arbitrage opportunities
          </p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Active > 1%" value={arbsOver1.toString()} icon="📊" />
        <StatCard label="Active > 2%" value={arbsOver2.toString()} highlight icon="🔥" />
        <StatCard label="Active > 5%" value={arbsOver5.toString()} icon="💎" />
        <StatCard label="90d Hypothetical P&L" value={`+${lastPerf.cumulativeReturn.toFixed(1)}%`} highlight icon="💰" />
      </div>

      {/* Top Arb Cards (visual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {arbOpportunities.slice(0, 3).map((arb) => (
          <ArbCard key={arb.id} arb={arb} />
        ))}
      </div>

      {/* Full Arb Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/60">All Active Opportunities</h2>
          <Badge variant="outline" className="border-white/10 text-white/30 text-[10px]">
            {arbOpportunities.length} active
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/40 text-xs">Market</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Buy</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Sell</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Raw Spread</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Net Spread</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Volume</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Time Open</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arbOpportunities.map((arb) => (
                <TableRow
                  key={arb.id}
                  className={`border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors ${getRowBorder(arb.rawSpread)}`}
                >
                  <TableCell className="font-medium text-sm text-white/80 max-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1 py-0.5 rounded border shrink-0 ${categoryColors[arb.category]}`}>
                        {arb.category}
                      </span>
                      <span className="truncate">{arb.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <PlatformBadge platform={arb.buyPlatform} />
                      <span className="font-mono text-sm font-bold">{Math.round(arb.buyPrice * 100)}¢</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <PlatformBadge platform={arb.sellPlatform} />
                      <span className="font-mono text-sm font-bold">{Math.round(arb.sellPrice * 100)}¢</span>
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
                  <TableCell className="text-center font-mono text-xs text-white/50">
                    {arb.timeOpen}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`text-xs ${
                      arb.trend === "widening" ? "text-emerald-400" : arb.trend === "narrowing" ? "text-red-400" : "text-white/30"
                    }`}>
                      {arb.trend === "widening" ? "↑" : arb.trend === "narrowing" ? "↓" : "→"} {arb.trend}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Historical Performance Chart */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-sm font-medium text-white/60 mb-4">
          Hypothetical Cumulative Returns — All Arbs &gt;2% (90d backtest)
        </h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={arbHistoricalPerformance}>
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
                interval={14}
              />
              <YAxis
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, "Cumulative Return"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="cumulativeReturn"
                stroke="#10b981"
                fill="url(#emeraldGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pro Callout */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
        <div className="text-sm text-white/60 mb-2">
          🔒 Showing top 5 arbs (15min delayed)
        </div>
        <div className="text-lg font-semibold text-white mb-1">
          Upgrade to Pro for real-time access to all opportunities
        </div>
        <p className="text-sm text-white/40 mb-4">
          Get instant push notifications, slippage-adjusted profitability, and historical backtest data.
        </p>
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
          Upgrade to Pro — $25/mo
        </button>
      </div>
    </div>
  );
}
