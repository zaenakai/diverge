"use client";

import Link from "next/link";
import { useTier } from "@/hooks/use-tier";

export function TierBadge() {
  const { tier, isFree, isPro, isEnterprise, isLoggedIn } = useTier();

  if (!isLoggedIn) return null;

  if (isEnterprise) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border border-purple-400/30 bg-purple-400/10 text-purple-400">
        Enterprise
      </span>
    );
  }

  if (isPro) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
        Pro
      </span>
    );
  }

  return (
    <Link href="/pricing" className="group inline-flex items-center gap-1.5">
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border border-white/20 bg-white/5 text-white/40">
        Free
      </span>
      <span className="text-[10px] text-emerald-400/60 group-hover:text-emerald-400 transition-colors">
        Upgrade
      </span>
    </Link>
  );
}
