"use client"

import TechniqueTag from "./TechniqueTag"

interface CoachResult {
  detected: string[]
  missed: string[]
  note: string
  tension_impact: "up" | "down" | "neutral"
}

interface CoachSidebarProps {
  latest: CoachResult | null
  isAnalyzing: boolean
}

export default function CoachSidebar({
  latest,
  isAnalyzing,
}: CoachSidebarProps) {
  return (
    <aside className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Coach
        </h2>
        {isAnalyzing && (
          <span className="text-xs text-zinc-500 animate-pulse">
            Analyzing...
          </span>
        )}
      </div>

      {!latest && !isAnalyzing && (
        <p className="text-xs text-zinc-600 leading-relaxed">
          Coaching notes will appear here after each of your messages.
        </p>
      )}

      {latest && (
        <div className="space-y-4">
          {latest.note && (
            <div className="rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-3">
              <p className="text-sm text-zinc-300 leading-relaxed italic">
                &ldquo;{latest.note}&rdquo;
              </p>
              <p className="mt-1.5 text-xs text-zinc-600">— Chris Voss</p>
            </div>
          )}

          {latest.detected.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Used well
              </p>
              <div className="flex flex-wrap gap-1.5">
                {latest.detected.map((t) => (
                  <TechniqueTag key={t} technique={t} type="detected" />
                ))}
              </div>
            </div>
          )}

          {latest.missed.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Missed
              </p>
              <div className="flex flex-wrap gap-1.5">
                {latest.missed.map((t) => (
                  <TechniqueTag key={t} technique={t} type="missed" />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Tension</span>
            <span
              className={
                latest.tension_impact === "up"
                  ? "text-red-400 font-medium"
                  : latest.tension_impact === "down"
                    ? "text-emerald-400 font-medium"
                    : "text-zinc-500"
              }
            >
              {latest.tension_impact === "up"
                ? "↑ increased"
                : latest.tension_impact === "down"
                  ? "↓ decreased"
                  : "→ neutral"}
            </span>
          </div>
        </div>
      )}
    </aside>
  )
}
