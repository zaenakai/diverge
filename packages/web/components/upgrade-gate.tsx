"use client";

import Link from "next/link";
import { useTier } from "@/hooks/use-tier";
import type { Tier } from "@/lib/tier-limits";

interface UpgradeGateProps {
  requiredTier: "pro" | "enterprise";
  feature: string;
  children: React.ReactNode;
  blurContent?: React.ReactNode;
}

const tierLabels: Record<string, string> = {
  pro: "Pro",
  enterprise: "Enterprise",
};

const tierPrices: Record<string, string> = {
  pro: "$25/mo",
  enterprise: "$99/mo",
};

export function UpgradeGate({ requiredTier, feature, children, blurContent }: UpgradeGateProps) {
  const { hasAccess } = useTier();

  if (hasAccess(requiredTier)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content underneath */}
      <div className="select-none pointer-events-none" style={{ filter: "blur(8px)" }} aria-hidden="true">
        {blurContent ?? children}
      </div>

      {/* Glass overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/80 to-[#0a0a0a]/60 backdrop-blur-sm" />
        <div className="relative z-20 text-center px-6 py-8 max-w-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <span className="text-xl">🔒</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{feature}</h3>
          <p className="text-sm text-white/50 mb-5">
            Upgrade to {tierLabels[requiredTier]} to unlock this feature
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all hover:shadow-lg hover:shadow-emerald-500/20"
          >
            Upgrade to {tierLabels[requiredTier]} — {tierPrices[requiredTier]} →
          </Link>
        </div>
      </div>
    </div>
  );
}

interface InlineUpgradeProps {
  requiredTier: "pro" | "enterprise";
  message: string;
  count?: number;
}

export function InlineUpgradeBanner({ requiredTier, message, count }: InlineUpgradeProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">🔒</span>
        <p className="text-sm text-white/50">
          {message}
          {count != null && (
            <span className="text-white/70 font-medium"> ({count} more available)</span>
          )}
        </p>
      </div>
      <Link
        href="/pricing"
        className="shrink-0 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
      >
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold mr-1.5">
          {tierLabels[requiredTier]}
        </span>
        Upgrade to {tierLabels[requiredTier]} →
      </Link>
    </div>
  );
}
