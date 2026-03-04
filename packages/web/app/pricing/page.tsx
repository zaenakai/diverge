"use client";

import { Check, X, Zap, Crown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with prediction market analytics",
    icon: Zap,
    cta: "Get Started",
    plan: null,
    features: {
      "Market views": "20/day",
      "Arb scanner": false,
      "Price history": "7 days",
      "Accuracy data": "Basic",
      "API access": false,
      "Compare tool": "Preview",
      "Whale alerts": false,
      "White-label": false,
      "Priority support": false,
    },
  },
  {
    name: "Pro",
    price: "$25",
    period: "/mo",
    description: "Full analytics for serious traders",
    icon: Crown,
    cta: "Upgrade to Pro",
    plan: "pro" as const,
    popular: true,
    features: {
      "Market views": "Unlimited",
      "Arb scanner": true,
      "Price history": "90 days",
      "Accuracy data": "Full",
      "API access": "1,000 req/day",
      "Compare tool": "Full history",
      "Whale alerts": true,
      "White-label": false,
      "Priority support": false,
    },
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    description: "Everything, unlimited, white-glove",
    icon: Building2,
    cta: "Go Enterprise",
    plan: "enterprise" as const,
    features: {
      "Market views": "Unlimited",
      "Arb scanner": true,
      "Price history": "Unlimited",
      "Accuracy data": "Full + Export",
      "API access": "Unlimited",
      "Compare tool": "Full history",
      "Whale alerts": true,
      "White-label": true,
      "Priority support": true,
    },
  },
];

const featureKeys = Object.keys(tiers[0].features) as Array<keyof (typeof tiers)[0]["features"]>;

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  async function handleCheckout(plan: string) {
    if (!session) {
      router.push(`/login?callbackUrl=/pricing`);
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setLoading(null);
    }
  }

  const currentTier = session?.user?.tier ?? "free";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400">
            Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Start free. Upgrade when you need full access to the arb scanner,
            extended history, and API.
          </p>
        </div>

        {/* Status banners */}
        {success && (
          <div className="mb-8 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-400">
            🎉 Subscription activated! Your account has been upgraded.
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center text-yellow-400">
            Checkout canceled. No changes were made.
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrentTier = currentTier === (tier.plan ?? "free");

            return (
              <div
                key={tier.name}
                className={`relative rounded-xl border p-8 flex flex-col ${
                  tier.popular
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-white/10 bg-white/[0.02]"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-500 text-black font-medium px-3">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-xl font-semibold">{tier.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-white/40">{tier.period}</span>
                  </div>
                  <p className="text-sm text-white/40">{tier.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {featureKeys.map((key) => {
                    const value = tier.features[key];
                    const enabled = value !== false;
                    return (
                      <li key={key} className="flex items-center gap-3 text-sm">
                        {enabled ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-white/20 shrink-0" />
                        )}
                        <span className={enabled ? "text-white/70" : "text-white/30"}>
                          {key}
                          {typeof value === "string" && (
                            <span className="text-white/40 ml-1">— {value}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {isCurrentTier ? (
                  <Button
                    variant="outline"
                    className="w-full border-white/20 text-white/50 cursor-default"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : tier.plan ? (
                  <Button
                    onClick={() => handleCheckout(tier.plan!)}
                    disabled={loading !== null}
                    className={`w-full ${
                      tier.popular
                        ? "bg-emerald-500 hover:bg-emerald-600 text-black font-medium"
                        : "bg-white/10 hover:bg-white/20 text-white"
                    }`}
                  >
                    {loading === tier.plan ? "Redirecting..." : tier.cta}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-white/20 hover:bg-white/5"
                    onClick={() => router.push("/markets")}
                  >
                    {tier.cta}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Manage subscription */}
        {currentTier !== "free" && (
          <div className="text-center mb-16">
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={loading === "portal"}
              className="border-white/20 text-white/60 hover:text-white"
            >
              {loading === "portal" ? "Opening..." : "Manage Subscription"}
            </Button>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-center mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-white/40 font-medium">Feature</th>
                  {tiers.map((tier) => (
                    <th key={tier.name} className="text-center py-4 px-4 text-white/60 font-medium">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((key) => (
                  <tr key={key} className="border-b border-white/5">
                    <td className="py-3 px-4 text-white/50">{key}</td>
                    {tiers.map((tier) => {
                      const value = tier.features[key];
                      return (
                        <td key={tier.name} className="text-center py-3 px-4">
                          {value === true ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : value === false ? (
                            <X className="w-4 h-4 text-white/20 mx-auto" />
                          ) : (
                            <span className="text-white/60">{value}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
