import TechniqueTag from "@/components/negotiation/TechniqueTag"

interface KeyMoment {
  sequence: number
  type: "highlight" | "miss" | "pivot"
  exchange_summary: string
  techniques_used: string[]
  techniques_missed: string[]
  why_it_mattered: string
  alternative_response: string | null
}

interface ReplayTimelineProps {
  moments: KeyMoment[]
}

const TYPE_STYLES = {
  highlight:
    "border-emerald-700/60 bg-emerald-900/20 text-emerald-400",
  miss: "border-red-700/60 bg-red-900/20 text-red-400",
  pivot: "border-amber-700/60 bg-amber-900/20 text-amber-400",
}
const TYPE_LABELS = {
  highlight: "Highlight",
  miss: "Miss",
  pivot: "Pivot",
}

export default function ReplayTimeline({ moments }: ReplayTimelineProps) {
  if (moments.length === 0) return null

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
        Key Moments
      </h2>
      <div className="space-y-3">
        {moments.map((m) => (
          <div
            key={m.sequence}
            className={`rounded-lg border px-4 py-3 space-y-2 ${TYPE_STYLES[m.type]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide opacity-80">
                {TYPE_LABELS[m.type]}
              </span>
              <span className="text-xs text-zinc-500">#{m.sequence}</span>
            </div>

            <p className="text-sm text-zinc-300 italic">
              &ldquo;{m.exchange_summary}&rdquo;
            </p>

            <p className="text-sm text-zinc-400 leading-relaxed">
              {m.why_it_mattered}
            </p>

            {(m.techniques_used.length > 0 ||
              m.techniques_missed.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {m.techniques_used.map((t) => (
                  <TechniqueTag key={t} technique={t} type="detected" />
                ))}
                {m.techniques_missed.map((t) => (
                  <TechniqueTag key={t} technique={t} type="missed" />
                ))}
              </div>
            )}

            {m.alternative_response && (
              <div className="mt-1 rounded-md bg-zinc-900/60 border border-zinc-700 px-3 py-2">
                <p className="text-xs text-zinc-500 mb-1 font-medium">
                  Better move:
                </p>
                <p className="text-sm text-zinc-300 italic">
                  &ldquo;{m.alternative_response}&rdquo;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
