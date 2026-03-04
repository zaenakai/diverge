import { formatUsd, categoryColors, type Platform } from "@/lib/format";
import { PlatformBadge } from "./platform-badge";
import { Sparkline } from "./sparkline";

interface Market {
  platform: Platform;
  category: string;
  matchedId?: string;
  title: string;
  sparkline: number[];
  yesPrice: number;
  noPrice: number;
  change24h: number;
  volume24h: number;
}

function formatPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

interface MarketCardProps {
  market: Market;
  showMatched?: boolean;
}

export function MarketCard({ market, showMatched }: MarketCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <PlatformBadge platform={market.platform} />
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${categoryColors[market.category] ?? categoryColors["Other"]}`}>
              {market.category}
            </span>
            {showMatched && market.matchedId && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                matched
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium leading-tight text-white/90 group-hover:text-white transition-colors line-clamp-2">
            {market.title}
          </h3>
        </div>
        <Sparkline data={market.sparkline} />
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] text-white/30 uppercase">Yes</div>
            <div className="text-lg font-mono font-bold text-emerald-400">
              {formatPrice(market.yesPrice)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase">No</div>
            <div className="text-lg font-mono font-bold text-red-400">
              {formatPrice(market.noPrice)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-mono font-medium ${market.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {market.change24h >= 0 ? "+" : ""}{market.change24h.toFixed(1)}%
          </div>
          <div className="text-[10px] text-white/30">{formatUsd(market.volume24h)} 24h</div>
        </div>
      </div>
    </div>
  );
}
