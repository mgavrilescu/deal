interface SkillScores {
  empathy: number
  frame: number
  calibrated_q: number
  audit: number
}

interface ScoreGridProps {
  overall: number
  skills: SkillScores
  openingLine: string
  outcome: "win" | "partial" | "loss"
  xpAwarded: number
}

const SKILL_LABELS: Record<keyof SkillScores, string> = {
  empathy: "Tactical Empathy",
  frame: "Frame Control",
  calibrated_q: "Calibrated Questions",
  audit: "Accusation Audit",
}

function ScoreBar({ value }: { value: number }) {
  const pct = (value / 10) * 100
  const color =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-500"
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 w-6 text-right tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

const OUTCOME_STYLES = {
  win: "text-emerald-400 border-emerald-700 bg-emerald-900/30",
  partial: "text-amber-400 border-amber-700 bg-amber-900/20",
  loss: "text-red-400 border-red-700 bg-red-900/20",
}
const OUTCOME_LABELS = { win: "Win", partial: "Partial", loss: "Loss" }

export default function ScoreGrid({
  overall,
  skills,
  openingLine,
  outcome,
  xpAwarded,
}: ScoreGridProps) {
  return (
    <div className="space-y-6">
      {/* Opening line */}
      <p className="text-lg text-zinc-200 leading-relaxed italic">
        &ldquo;{openingLine}&rdquo;
      </p>

      {/* Overall + outcome */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 border-zinc-600 bg-zinc-900">
          <span className="text-2xl font-bold text-white tabular-nums">
            {overall}
          </span>
          <span className="text-xs text-zinc-500">/ 100</span>
        </div>
        <div className="space-y-1.5">
          <span
            className={`inline-block rounded-full border px-3 py-0.5 text-sm font-medium ${OUTCOME_STYLES[outcome]}`}
          >
            {OUTCOME_LABELS[outcome]}
          </span>
          <p className="text-sm text-zinc-500">
            +{xpAwarded} XP
          </p>
        </div>
      </div>

      {/* Skill scores */}
      <div className="space-y-3">
        {(Object.keys(SKILL_LABELS) as Array<keyof SkillScores>).map((key) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
                {SKILL_LABELS[key]}
              </span>
            </div>
            <ScoreBar value={skills[key]} />
          </div>
        ))}
      </div>
    </div>
  )
}
