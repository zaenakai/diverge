"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTier } from "@/hooks/use-tier";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { tier, isFree, isPro, isEnterprise } = useTier();
  const [apiKey, setApiKey] = useState<string | null>(session?.user?.apiKey ?? null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  if (!session?.user) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-white/40 mb-4">You must be signed in to access settings.</p>
        <Link href="/login?callbackUrl=/settings">
          <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">Sign In</Button>
        </Link>
      </div>
    );
  }

  async function generateApiKey() {
    setGenerating(true);
    try {
      const res = await fetch("/api/user/api-key", { method: "POST" });
      const data = await res.json();
      if (data.apiKey) {
        setApiKey(data.apiKey);
        setShowApiKey(true);
      }
    } catch (err) {
      console.error("Failed to generate API key:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  }

  function copyApiKey() {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function maskApiKey(key: string): string {
    if (key.length <= 12) return key;
    return key.slice(0, 12) + "•".repeat(key.length - 16) + key.slice(-4);
  }

  const tierBadgeStyles: Record<string, string> = {
    free: "border-white/20 bg-white/5 text-white/50",
    pro: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    enterprise: "border-purple-400/30 bg-purple-400/10 text-purple-400",
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage your account and subscription</p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="flex items-center gap-4">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? "Avatar"}
              className="w-16 h-16 rounded-full border border-white/10"
            />
          )}
          <div>
            <div className="text-lg font-medium">{session.user.name ?? "User"}</div>
            <div className="text-sm text-white/40">{session.user.email}</div>
          </div>
        </div>
      </div>

      {/* Plan Section */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Subscription</h2>
          <Badge variant="outline" className={`text-xs font-semibold ${tierBadgeStyles[tier]}`}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
        </div>

        <div className="text-sm text-white/50">
          {isFree && "You're on the Free plan. Upgrade for full access to all features."}
          {isPro && !isEnterprise && "You're on the Pro plan — $25/mo. Full analytics access."}
          {isEnterprise && "You're on the Enterprise plan — $99/mo. Unlimited everything."}
        </div>

        <div className="flex items-center gap-3">
          {isFree ? (
            <Link href="/pricing">
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                Upgrade Plan
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              onClick={handlePortal}
              disabled={portalLoading}
              className="border-white/20 text-white/60 hover:text-white"
            >
              {portalLoading ? "Opening..." : "Manage Billing"}
            </Button>
          )}
        </div>
      </div>

      {/* API Key Section */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">API Key</h2>
          {isEnterprise ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">
              Available
            </Badge>
          ) : (
            <Badge variant="outline" className="border-white/20 text-white/30 text-[10px]">
              Enterprise Only
            </Badge>
          )}
        </div>

        {isEnterprise ? (
          <div className="space-y-3">
            <p className="text-sm text-white/50">
              Use your API key to access the Diverge API programmatically.
            </p>

            {apiKey ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono text-sm bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white/70">
                  {showApiKey ? apiKey : maskApiKey(apiKey)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="border-white/20 text-white/50 hover:text-white shrink-0"
                >
                  {showApiKey ? "Hide" : "Reveal"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyApiKey}
                  className="border-white/20 text-white/50 hover:text-white shrink-0"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-white/30">No API key generated yet.</p>
            )}

            <Button
              onClick={generateApiKey}
              disabled={generating}
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              {generating ? "Generating..." : apiKey ? "Regenerate API Key" : "Generate API Key"}
            </Button>

            {apiKey && (
              <p className="text-xs text-white/30">
                Regenerating will invalidate your existing key. Make sure to update your integrations.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/40">
              API access is available on the Enterprise plan. Programmatically access market data, arbs, and more.
            </p>
            <Link href="/pricing">
              <Button variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                Upgrade to Enterprise →
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
