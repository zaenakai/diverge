import type { ArbOpportunity } from "@/lib/mock-data";
import { formatUsd, categoryColors } from "@/lib/mock-data";
import { PlatformBadge } from "./platform-badge";

interface ArbCardProps {
  arb: ArbOpportunity;
}

function getSpreadColor(spread: number): string {
  if (spread >= 5) return "text-emerald-400";
  if (spread >= 3) return "text-yellow-400";
  return "text-white/50";
}

function getSpreadBgColor(spread: number): string {
  if (spread >= 5) return "border-emerald-500/30 bg-emerald-500/5";
  if (spread >= 3) return "border-yellow-500/30 bg-yellow-500/5";
  return "border-white/10 bg-white/[0.02]";
}

function parseTimeOpen(timeOpen: string): number {
  const match = timeOpen.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function getTimeColor(timeOpen: string): string {
  const minutes = parseTimeOpen(timeOpen);
  if (minutes < 60) return "text-emerald-400";
  if (minutes <= 360) return "text-yellow-400";
  return "text-red-400";
}

export function ArbCard({ arb }: ArbCardProps) {
  const polyPlatform = arb.buyPlatform === "polymarket" ? "buy" : "sell";
  const kalshiPlatform = arb.buyPlatform === "kalshi" ? "buy" : "sell";

  return (
    <div className={`rounded-xl border p-4 hover:border-white/20 transition-all flex flex-col ${getSpreadBgColor(arb.rawSpread)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${categoryColors[arb.category]}`}>
              {arb.category}
            </span>
            {arb.trend === "widening" && (
              <span className="text-sm font-bold text-red-400">↑ Widening</span>
            )}
            {arb.trend === "narrowing" && (
              <span className="text-sm font-bold text-yellow-400">↓ Narrowing</span>
            )}
          </div>
          <h3 className="text-sm font-medium leading-tight text-white/90">
            {arb.title}
          </h3>
        </div>
        <div className={`text-xl font-bold font-mono text-emerald-500`}>
          {arb.rawSpread.toFixed(1)}%
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 rounded-lg bg-white/[0.03] p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-emerald-400 uppercase font-medium">Buy</span>
            <PlatformBadge platform={arb.buyPlatform} />
          </div>
          <div className="text-lg font-mono font-bold">
            {Math.round(arb.buyPrice * 100)}¢
          </div>
        </div>
        <div className="text-white/20">→</div>
        <div className="flex-1 rounded-lg bg-white/[0.03] p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-blue-400 uppercase font-medium">Sell</span>
            <PlatformBadge platform={arb.sellPlatform} />
          </div>
          <div className="text-lg font-mono font-bold">
            {Math.round(arb.sellPrice * 100)}¢
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/40 mb-3">
        <span>Net: <span className={`font-mono ${getSpreadColor(arb.adjustedSpread)}`}>{arb.adjustedSpread.toFixed(1)}%</span> after fees</span>
        <span>{formatUsd(arb.volume)} vol</span>
        <span className={`font-semibold ${getTimeColor(arb.timeOpen)}`}>Open {arb.timeOpen}</span>
      </div>

      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-white/[0.06]">
        <a
          href="#"
          className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20 hover:bg-blue-400/20 transition"
        >
          Trade on Polymarket →
        </a>
        <a
          href="#"
          className="flex-1 text-center text-[11px] font-medium py-1.5 rounded-lg bg-orange-400/10 text-orange-400 border border-orange-400/20 hover:bg-orange-400/20 transition"
        >
          Trade on Kalshi →
        </a>
      </div>
    </div>
  );
}
