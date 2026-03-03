interface StatCardProps {
  label: string;
  value: string;
  highlight?: boolean;
  subtext?: string;
  icon?: string;
}

export function StatCard({ label, value, highlight, subtext, icon }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        highlight
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-xs text-white/40 uppercase tracking-wider">{label}</span>
      </div>
      <div
        className={`text-2xl font-bold font-mono mt-1 ${
          highlight ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </div>
      {subtext && <div className="text-xs text-white/30 mt-0.5">{subtext}</div>}
    </div>
  );
}
