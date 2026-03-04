"use client";

import { useState, useCallback } from "react";
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
import type { AccuracyData, NotableMiss } from "@/lib/mock-data";
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
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brierSeverityClass(impact: number): string {
  if (impact > 0.5) return "text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded";
  if (impact >= 0.2) return "text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded";
  return "text-white/40";
}

function shareToX(text: string) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
}

// ─── Sort helpers ────────────────────────────────────────────────────────────

type CategorySortKey = "category" | "polyBrier" | "kalshiBrier" | "winner" | "sampleSize";
type SortDir = "asc" | "desc";

function sortCategories(data: AccuracyData[], key: CategorySortKey, dir: SortDir): AccuracyData[] {
  return [...data].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case "category":
        cmp = a.category.localeCompare(b.category);
        break;
      case "polyBrier":
        cmp = a.polyBrier - b.polyBrier;
        break;
      case "kalshiBrier":
        cmp = a.kalshiBrier - b.kalshiBrier;
        break;
      case "winner": {
        const aWin = a.polyBrier < a.kalshiBrier ? "Polymarket" : "Kalshi";
        const bWin = b.polyBrier < b.kalshiBrier ? "Polymarket" : "Kalshi";
        cmp = aWin.localeCompare(bWin);
        break;
      }
      case "sampleSize":
        cmp = a.sampleSize - b.sampleSize;
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="text-white/20 ml-1">↕</span>;
  return <span className="text-white/60 ml-1">{dir === "asc" ? "▲" : "▼"}</span>;
}

// ─── Custom Calibration Tooltip ──────────────────────────────────────────────

function CalibrationTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ name: string; payload: { predicted: number; actual: number; sampleSize: number } }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const platform = payload[0].name;
  const color = platform === "Polymarket" ? "#60a5fa" : "#fb923c";
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm shadow-xl">
      <div className="font-medium" style={{ color }}>{platform}</div>
      <div className="text-white/70 mt-1">
        {Math.round(point.predicted * 100)}% predicted → {Math.round(point.actual * 100)}% actual
      </div>
      <div className="text-white/40 text-xs mt-0.5">
        {point.sampleSize} markets in bucket
      </div>
    </div>
  );
}

// ─── Brier Info Tooltip ──────────────────────────────────────────────────────

function BrierInfoTooltip({ platform }: { platform: "polymarket" | "kalshi" }) {
  const [show, setShow] = useState(false);
  const score = platform === "polymarket" ? overallBrier.polymarket : overallBrier.kalshi;
  const improvement = Math.round((1 - score / 0.25) * 100);
  const resolved = platform === "polymarket" ? overallBrier.polymarketResolved : overallBrier.kalshiResolved;
  const name = platform === "polymarket" ? "Polymarket" : "Kalshi";

  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/20 text-white/30 hover:text-white/60 hover:border-white/40 transition-colors text-[9px] leading-none cursor-help ml-2"
        aria-label="Brier score info"
      >
        i
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-[260px] bg-[#1a1a1a] border border-white/10 rounded-lg p-3 text-sm text-white/70 shadow-xl pointer-events-none">
          <div className="font-medium text-white/90 mb-1.5">Brier Score</div>
          <p className="text-xs leading-relaxed">
            Measures prediction accuracy (0 = perfect, 1 = always wrong)
          </p>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/40">Random baseline:</span>
              <span className="font-mono">0.250</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">{name} vs random:</span>
              <span className="text-emerald-400 font-medium">{improvement}% better</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Based on:</span>
              <span>{resolved.toLocaleString()} resolved markets</span>
            </div>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a1a1a] border-r border-b border-white/10 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

// ─── Share Button ────────────────────────────────────────────────────────────

function XShareButton({ text, className = "" }: { text: string; className?: string }) {
  return (
    <button
      onClick={() => shareToX(text)}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md bg-white/[0.06] border border-white/[0.08] text-white/40 hover:text-white hover:bg-white/[0.12] transition-all ${className}`}
      aria-label="Share to X"
    >
      <span className="text-xs font-bold">𝕏</span>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AccuracyPage() {
  // Category table sort state
  const [catSort, setCatSort] = useState<{ key: CategorySortKey; dir: SortDir }>({
    key: "sampleSize",
    dir: "desc",
  });

  const handleCatSort = useCallback((key: CategorySortKey) => {
    setCatSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }, []);

  const sortedCategories = sortCategories(accuracyByCategory, catSort.key, catSort.dir);

  // Head-to-head share text
  const polyBetter = overallBrier.polymarket < overallBrier.kalshi;
  const accuracyDiff = Math.round(
    Math.abs(
      ((overallBrier.kalshi - overallBrier.polymarket) / overallBrier.kalshi) * 100
    )
  );
  const totalResolved = overallBrier.polymarketResolved + overallBrier.kalshiResolved;
  const headToHeadShareText = polyBetter
    ? `Polymarket is ${accuracyDiff}% more accurate than Kalshi across ${totalResolved.toLocaleString()} resolved markets.\n\nBrier Score: Polymarket ${overallBrier.polymarket} vs Kalshi ${overallBrier.kalshi}\n\nFull breakdown → diverge.market/accuracy`
    : `Kalshi is ${accuracyDiff}% more accurate than Polymarket across ${totalResolved.toLocaleString()} resolved markets.\n\nBrier Score: Kalshi ${overallBrier.kalshi} vs Polymarket ${overallBrier.polymarket}\n\nFull breakdown → diverge.market/accuracy`;

  // Calibration data formatted for recharts
  const polyCalibration = calibrationData.map((d) => ({
    predicted: d.predicted,
    actual: d.actualPoly,
    sampleSize: d.sampleSizePoly,
  }));
  const kalshiCalibration = calibrationData.map((d) => ({
    predicted: d.predicted,
    actual: d.actualKalshi,
    sampleSize: d.sampleSizeKalshi,
  }));

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

      {/* Big Brier Score Comparison — screenshot-friendly */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-medium text-white/60">Head-to-Head Accuracy</h2>
          <span className="text-xs text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-md">Lower score = more accurate</span>
          <XShareButton text={headToHeadShareText} />
        </div>
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
            <div className="flex items-baseline">
              <span className="text-5xl font-bold font-mono text-white mt-2">
                {overallBrier.polymarket}
              </span>
              <BrierInfoTooltip platform="polymarket" />
            </div>
            <div className="text-xs text-white/30 mt-2">
              Avg Brier Score • {overallBrier.polymarketResolved.toLocaleString()} resolved markets
            </div>
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
            <div className="flex items-baseline">
              <span className="text-5xl font-bold font-mono text-white mt-2">
                {overallBrier.kalshi}
              </span>
              <BrierInfoTooltip platform="kalshi" />
            </div>
            <div className="text-xs text-white/30 mt-2">
              Avg Brier Score • {overallBrier.kalshiResolved.toLocaleString()} resolved markets
            </div>
          </div>
        </div>
        {/* Watermark for screenshots */}
        <div className="absolute bottom-2 right-3 text-[10px] text-white/10 font-mono select-none pointer-events-none">
          diverge.market
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
                label={{
                  value: "Predicted Probability",
                  position: "bottom",
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 11,
                  offset: -5,
                }}
              />
              <YAxis
                dataKey="actual"
                type="number"
                domain={[0, 1]}
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                name="Actual"
                label={{
                  value: "Actual Outcome Rate",
                  angle: -90,
                  position: "insideLeft",
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
                label={{ value: "Perfect", fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
              />
              <RechartsTooltip content={<CalibrationTooltipContent />} />
              <Scatter
                name="Polymarket"
                data={polyCalibration}
                fill="#60a5fa"
                line={{ stroke: "#60a5fa", strokeWidth: 1.5 }}
                lineType="fitting"
                shape="circle"
              />
              <Scatter
                name="Kalshi"
                data={kalshiCalibration}
                fill="#fb923c"
                line={{ stroke: "#fb923c", strokeWidth: 1.5 }}
                lineType="fitting"
                shape="circle"
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

      {/* Category Breakdown — sortable */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-medium text-white/60">Accuracy by Category</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead
                  className="text-white/40 text-xs cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleCatSort("category")}
                >
                  Category
                  <SortArrow active={catSort.key === "category"} dir={catSort.dir} />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleCatSort("polyBrier")}
                >
                  <span className="text-blue-400">Polymarket</span>
                  <SortArrow active={catSort.key === "polyBrier"} dir={catSort.dir} />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleCatSort("kalshiBrier")}
                >
                  <span className="text-orange-400">Kalshi</span>
                  <SortArrow active={catSort.key === "kalshiBrier"} dir={catSort.dir} />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleCatSort("winner")}
                >
                  Winner
                  <SortArrow active={catSort.key === "winner"} dir={catSort.dir} />
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs text-center cursor-pointer hover:text-white/70 transition-colors select-none"
                  onClick={() => handleCatSort("sampleSize")}
                >
                  Sample Size
                  <SortArrow active={catSort.key === "sampleSize"} dir={catSort.dir} />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map((row) => {
                const polyWins = row.polyBrier < row.kalshiBrier;
                return (
                  <TableRow key={row.category} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-1 rounded-md border capitalize ${categoryColors[row.category]}`}
                      >
                        {row.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`font-mono text-sm ${polyWins ? "font-bold text-blue-400" : "text-white/50"}`}
                      >
                        {row.polyBrier.toFixed(3)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`font-mono text-sm ${!polyWins ? "font-bold text-orange-400" : "text-white/50"}`}
                      >
                        {row.kalshiBrier.toFixed(3)}
                      </span>
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
                    <TableCell className="text-center font-mono text-xs text-white/50">
                      {row.sampleSize}
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
              <RechartsTooltip
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
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-medium text-white/60">Notable Misses</h2>
          <p className="text-xs text-white/30 mt-0.5">
            Markets where platforms were most wrong
          </p>
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
                <TableHead className="text-white/40 text-xs">Context</TableHead>
                <TableHead className="text-white/40 text-xs text-center">Resolved</TableHead>
                <TableHead className="text-white/40 text-xs w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {notableMisses.map((miss, i) => {
                const missShareText = `Prediction markets predicted "${miss.market}" at ${Math.round(miss.predictedProb * 100)}% — ${miss.actualOutcome === "YES" ? "it happened" : "it didn't happen"}.\n\nBrier impact: ${miss.brierContribution.toFixed(2)}\n\nMore misses → diverge.market/accuracy`;
                return (
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
                      <span className={`font-mono text-sm inline-block ${brierSeverityClass(miss.brierContribution)}`}>
                        {miss.brierContribution.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-white/40 text-xs max-w-[200px] truncate block"
                        title={miss.context}
                      >
                        {miss.context}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-white/40">
                      {miss.resolvedDate}
                    </TableCell>
                    <TableCell className="text-center">
                      <XShareButton text={missShareText} className="opacity-0 group-hover:opacity-100" />
                    </TableCell>
                  </TableRow>
                );
              })}
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
