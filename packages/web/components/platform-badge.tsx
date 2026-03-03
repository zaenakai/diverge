import type { Platform } from "@/lib/mock-data";

interface PlatformBadgeProps {
  platform: Platform;
  size?: "sm" | "md";
}

export function PlatformBadge({ platform, size = "sm" }: PlatformBadgeProps) {
  const isPolymarket = platform === "polymarket";
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium border ${sizeClasses} ${
        isPolymarket
          ? "bg-blue-400/10 text-blue-400 border-blue-400/20"
          : "bg-orange-400/10 text-orange-400 border-orange-400/20"
      }`}
    >
      {isPolymarket ? "Polymarket" : "Kalshi"}
    </span>
  );
}
