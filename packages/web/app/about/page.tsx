import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Diverge",
  description:
    "Diverge is a cross-platform prediction market analytics platform comparing Polymarket and Kalshi in real-time.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Hero */}
        <div className="mb-16">
          <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400">
            About
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Cross-platform prediction market intelligence
          </h1>
          <p className="text-lg text-white/50 max-w-2xl">
            Diverge tracks 59,000+ markets across Polymarket and Kalshi, finding
            price divergences and arbitrage opportunities in real-time.
          </p>
        </div>

        {/* What we do */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">What we do</h2>
          <ul className="space-y-3 text-white/60">
            {[
              "Track markets across Polymarket and Kalshi",
              "Match identical markets across platforms using NLP",
              "Detect price divergences between platforms",
              "Calculate arbitrage opportunities in real-time",
              "Measure platform accuracy with Brier scores",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5 shrink-0">→</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Why it matters */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">Why it matters</h2>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-white/60 space-y-3 leading-relaxed">
            <p>
              Prediction markets are the most accurate forecasting tool ever
              created — but they&apos;re fragmented across platforms. Different
              platforms price the same events differently.
            </p>
            <p>
              Sometimes Polymarket says 72% and Kalshi says 65% on the exact
              same outcome. That&apos;s free money if you know where to look.
            </p>
            <p className="text-white/80 font-medium">
              Diverge finds those differences.
            </p>
          </div>
        </section>

        {/* Data */}
        <section className="mb-14">
          <h2 className="text-xl font-semibold mb-4">The data</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Market updates", value: "Every minute" },
              { label: "Market matching", value: "NLP-powered" },
              { label: "Arb detection", value: "Every 2 minutes" },
              { label: "Price history", value: "Tracked continuously" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="text-sm text-white/40 mb-1">{item.label}</div>
                <div className="text-lg font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Built by */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Built by</h2>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="text-lg font-semibold mb-1">zaenakai</div>
                <p className="text-white/50 text-sm mb-3">
                  Builder, trader, full-stack dev. Previously at Polymarket.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <a
                    href="https://x.com/zaenakai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    @zaenakai
                  </a>
                  <a
                    href="https://x.com/zaenakai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    𝕏 @zaenakai
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
