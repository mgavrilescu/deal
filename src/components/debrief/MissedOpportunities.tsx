interface MissedOpportunity {
  sequence: number
  what_happened: string
  better_response: string
}

interface MissedOpportunitiesProps {
  opportunities: MissedOpportunity[]
  closingNote: string
}

export default function MissedOpportunities({
  opportunities,
  closingNote,
}: MissedOpportunitiesProps) {
  return (
    <div className="space-y-6">
      {opportunities.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
            Missed Opportunities
          </h2>
          <div className="space-y-3">
            {opportunities.map((o) => (
              <div
                key={o.sequence}
                className="rounded-lg border border-zinc-700 bg-zinc-900/40 px-4 py-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">{o.what_happened}</p>
                  <span className="text-xs text-zinc-600 shrink-0 ml-2">
                    #{o.sequence}
                  </span>
                </div>
                <div className="rounded-md bg-zinc-900 border border-zinc-700 px-3 py-2">
                  <p className="text-xs text-zinc-500 mb-1 font-medium">
                    You could have said:
                  </p>
                  <p className="text-sm text-zinc-200 italic">
                    &ldquo;{o.better_response}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closing note */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
          Chris Voss
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed italic">
          &ldquo;{closingNote}&rdquo;
        </p>
      </div>
    </div>
  )
}
