"use client";

import { Badge } from "@/components/ui/badge";
import { PlatformBadge } from "@/components/platform-badge";
import {
  overallBrier,
  accuracyByCategory,
  calibrationData,
  accuracyTrend,
  notableMisses,
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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";

export default function AccuracyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🎯 Platform Accuracy
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Who predicts better? Brier score analysis across resolved markets.
        </p>
      </div>

      {/* Big Brier Score Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            {overallBrier.polymarket < overallBrier.kalshi && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                👑 More Accurate
              </Badge>
            )}
          </div>
          <div className="text-sm font-medium text-blue-400 mb-1">Polymarket</div>
          <div className="text-5xl font-bold font-mono text-white mt-2">{overallBrier.polymarket}</div>
          <div className="text-xs text-white/30 mt-2">
            Avg Brier Score • {overallBrier.polymarketResolved.toLocaleString()} resolved markets
          </div>
          <div className="text-xs text-white/20 mt-1">Lower = more accurate</div>
        </div>
        <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            {overallBrier.kalshi < overallBrier.polymarket && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                👑 More Accurate
              </Badge>
            )}
          </div>
          <div className="text-sm font-medium text-orange-400 mb-1">Kalshi</div>
          <div className="text-5xl font-bold font-mono text-white mt-2">{overallBrier.kalshi}</div>
          <div className="text-xs text-white/30 mt-2">
            Avg Brier Score • {overallBrier.kalshiResolved.toLocaleString()} resolved markets
          </div>
          <div className="text-xs text-white/20 mt-1">Lower = more accurate</div>
        </div>
      </div>

      {/* Calibration Curve */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-sm font-medium text-white/60 mb-1">Calibration Curve</h2>
        <p className="text-xs text-white/30 mb-4">
          When a platform says 70%, how often does it actually happen? Perfect calibration = diagonal line.
        </p>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="predicted"
                type="number"
                domain={[0, 1]}
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                name="Predicted"
                label={{ value: "Predicted Probability", position: "bottom", fill: "rgba(255,255,255,0.3)", fontSize: 11, offset: -5 }}
              />
              <YAxis
                type="number"
                domain={[0, 1]}
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                name="Actual"
                label={{ value: "Actual Outcome Rate", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              />
              <ReferenceLine
                segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
                label={{ value: "Perfect", fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "12px",
                }}
                formatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
              />
              <Scatter
                name="Polymarket"
                data={calibrationData.map(d => ({ predicted: d.predicted, actual: d.actualPoly }))}
                fill="#60a5fa"
                line={{ stroke: "#60a5fa", strokeWidth: 1.5 }}
                lineType="fitting"
              />
              <Scatter
                name="Kalshi"
                data={calibrationData.map(d => ({ predicted: d.predicted, actual: d.actualKalshi }))}
                fill="#fb923c"
                line={{ stroke: "#fb923c", strokeWidth: 1.5 }}
                lineType="fitting"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" /> Polymarket
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" /> Kalshi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0 border-t border-dashed border-white/30" /> Perfect
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-medium text-white/60">Accuracy by Category</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/40 text-xs">Category</TableHead>
                <TableHead className="text-white/40 text-xs text-center">
                  <span className="text-blue-400">Polymarket</span>
                </TableHead>
                <TableHead className="text-white/40 text-xs text-center">
                  <span className="text-orange-400">Kalshi</span>
                </TableHead>
                <TableHead className="text-white/40 text-xs text-center">Sample Size</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Winner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accuracyByCategory.map((row) => {
                const polyWins = row.polyBrier < row.kalshiBrier;
                return (
                  <TableRow key={row.category} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-md border capitalize ${categoryColors[row.category]}`}>
                        {row.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm ${polyWins ? "font-bold text-blue-400" : "text-white/50"}`}>
                        {row.polyBrier.toFixed(3)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-mono text-sm ${!polyWins ? "font-bold text-orange-400" : "text-white/50"}`}>
                        {row.kalshiBrier.toFixed(3)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-white/50">
                      {row.sampleSize}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          polyWins
                            ? "border-blue-400/30 text-blue-400"
                            : "border-orange-400/30 text-orange-400"
                        }`}
                      >
                        {polyWins ? "Polymarket" : "Kalshi"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Accuracy Trend */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="text-sm font-medium text-white/60 mb-1">Accuracy Trend (6 months)</h2>
        <p className="text-xs text-white/30 mb-4">Both platforms are improving over time.</p>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accuracyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="month"
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
              />
              <YAxis
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                domain={[0.13, 0.19]}
                tickFormatter={(v: number) => v.toFixed(3)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "12px",
                }}
                formatter={(value) => [Number(value).toFixed(3), ""]}
              />
              <Line
                type="monotone"
                dataKey="polyBrier"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ fill: "#60a5fa", r: 3 }}
                name="Polymarket"
              />
              <Line
                type="monotone"
                dataKey="kalshiBrier"
                stroke="#fb923c"
                strokeWidth={2}
                dot={{ fill: "#fb923c", r: 3 }}
                name="Kalshi"
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Notable Misses */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-medium text-white/60">Notable Misses</h2>
          <p className="text-xs text-white/30 mt-0.5">Markets where platforms were most wrong</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/40 text-xs">Market</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Platform</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Predicted</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Outcome</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Brier Impact</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Resolved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notableMisses.map((miss, i) => (
                <TableRow key={i} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell className="text-sm text-white/80 max-w-[200px] truncate">
                    {miss.market}
                  </TableCell>
                  <TableCell className="text-center">
                    <PlatformBadge platform={miss.platform} />
                  </TableCell>
                  <TableCell className="text-center font-mono text-sm text-white/60">
                    {Math.round(miss.predictedProb * 100)}%
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        miss.actualOutcome === "YES"
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-red-500/30 text-red-400"
                      }`}
                    >
                      {miss.actualOutcome}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-mono text-sm ${
                      miss.brierContribution > 0.3 ? "text-red-400 font-bold" : "text-white/50"
                    }`}>
                      {miss.brierContribution.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-white/40">
                    {miss.resolvedDate}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pro CTA */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">🎯</span>
          <p className="text-sm text-white/50">
            Category-level accuracy data is a{" "}
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold mx-0.5">
              Pro
            </span>{" "}
            feature. See which platform wins in Politics, Crypto, Sports &amp; more.
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
  );
}
