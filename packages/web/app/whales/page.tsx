"use client";

import Link from "next/link";
import { UpgradeGate } from "@/components/upgrade-gate";
import { useTier } from "@/hooks/use-tier";

export default function WhalesPage() {
  const { isEnterprise } = useTier();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">🐋 Whale Tracker</h1>
        <p className="text-sm text-white/40 mt-1">
          Track large trades and whale movements across prediction markets
        </p>
      </div>

      {isEnterprise ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🐋</div>
          <h2 className="text-xl font-semibold mb-2">Whale Tracking Active</h2>
          <p className="text-sm text-white/40 max-w-md mx-auto">
            Whale trade data is being collected. This dashboard will populate as large trades are detected across Polymarket and Kalshi.
          </p>
        </div>
      ) : (
        <UpgradeGate
          requiredTier="enterprise"
          feature="Whale Tracking"
          blurContent={
            <div className="space-y-4">
              {/* Fake whale data for blur effect */}
              {[...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🐋</span>
                    <div>
                      <div className="text-sm font-medium text-white/80">Large trade detected on Polymarket</div>
                      <div className="text-xs text-white/40 mt-0.5">Will Trump win 2024? · 2 minutes ago</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-emerald-400">${(Math.random() * 500000 + 50000).toFixed(0)}</div>
                    <div className="text-xs text-white/30">YES at 65¢</div>
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🐋</div>
            <h2 className="text-xl font-semibold mb-2">Whale Tracking</h2>
            <p className="text-sm text-white/40">Enterprise feature</p>
          </div>
        </UpgradeGate>
      )}
    </div>
  );
}
