"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { MarketCard } from "@/components/market-card";
import { markets, type Category, type Platform } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type FilterType = "all" | Platform | Category;
type SortType = "volume" | "newest" | "closing" | "change";

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "polymarket", label: "Polymarket" },
  { value: "kalshi", label: "Kalshi" },
  { value: "politics", label: "Politics" },
  { value: "crypto", label: "Crypto" },
  { value: "sports", label: "Sports" },
  { value: "economics", label: "Economics" },
];

const sortOptions: { value: SortType; label: string }[] = [
  { value: "volume", label: "Volume" },
  { value: "newest", label: "Newest" },
  { value: "closing", label: "Closing Soon" },
  { value: "change", label: "Price Change" },
];

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("volume");

  const filtered = useMemo(() => {
    let result = markets;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.title.toLowerCase().includes(q));
    }

    if (filter !== "all") {
      result = result.filter(
        (m) => m.platform === filter || m.category === filter
      );
    }

    switch (sort) {
      case "volume":
        result = [...result].sort((a, b) => b.volume24h - a.volume24h);
        break;
      case "newest":
        result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "closing":
        result = [...result].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        break;
      case "change":
        result = [...result].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
        break;
    }

    return result;
  }, [search, filter, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Markets Explorer</h1>
        <p className="text-sm text-white/40 mt-1">
          {markets.length} markets across Polymarket & Kalshi
        </p>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white">
              Sort: {sortOptions.find((s) => s.value === sort)?.label}
              <svg className="ml-2 w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#1a1a1a] border-white/10">
            {sortOptions.map((opt) => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setSort(opt.value)}
                className="text-white/70 hover:text-white focus:text-white focus:bg-white/10"
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filter === f.value
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:border-white/20"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-xs text-white/30">
        Showing {filtered.length} market{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Market Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((market) => (
          <MarketCard key={market.id} market={market} showMatched />
        ))}
      </div>
    </div>
  );
}
