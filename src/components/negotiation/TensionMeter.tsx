"use client"

interface TensionMeterProps {
  value: number // 0–1
}

export default function TensionMeter({ value }: TensionMeterProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)

  // Color transitions: green → yellow → red
  const color =
    pct < 40
      ? "bg-emerald-500"
      : pct < 70
        ? "bg-amber-400"
        : "bg-red-500"

  const label =
    pct < 30
      ? "Low"
      : pct < 50
        ? "Building"
        : pct < 70
          ? "Elevated"
          : pct < 85
            ? "High"
            : "Critical"

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span className="font-medium uppercase tracking-wide">Tension</span>
        <span className={pct >= 70 ? "text-red-400 font-semibold" : ""}>{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
