import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getSession } from "@/actions/session"
import { getDebrief } from "@/actions/debrief"
import ScoreGrid from "@/components/debrief/ScoreGrid"
import ReplayTimeline from "@/components/debrief/ReplayTimeline"
import MissedOpportunities from "@/components/debrief/MissedOpportunities"

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function DebriefPage({ params }: Props) {
  const { sessionId } = await params

  const authSession = await auth()
  if (!authSession?.user) redirect("/api/auth/signin")

  let session
  try {
    session = await getSession(sessionId)
  } catch {
    notFound()
  }

  const debrief = await getDebrief(sessionId)
  if (!debrief) notFound()

  const ctx = session.scenarioContext as {
    userRole: string
    counterpartProfile: string
    goal: string
    description: string
  }

  const rawScores = debrief.skillScores as {
    empathy: number
    frame: number
    calibrated_q: number
    audit: number
    opening_line?: string
    closing_note?: string
  }

  const skillScores = {
    empathy: rawScores.empathy,
    frame: rawScores.frame,
    calibrated_q: rawScores.calibrated_q,
    audit: rawScores.audit,
  }

  type KeyMoment = {
    sequence: number
    type: "highlight" | "miss" | "pivot"
    exchange_summary: string
    techniques_used: string[]
    techniques_missed: string[]
    why_it_mattered: string
    alternative_response: string | null
  }

  type MissedOpp = {
    sequence: number
    what_happened: string
    better_response: string
  }

  const keyMoments = (debrief.keyMoments as KeyMoment[]) ?? []
  const missedOpportunities = (debrief.missedOpportunities as MissedOpp[]) ?? []
  const openingLine = rawScores.opening_line ?? ""
  const closingNote = rawScores.closing_note ?? ""

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        {/* Header */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
            Debrief — Arena
          </p>
          <h1 className="text-xl font-semibold text-white">
            {ctx.counterpartProfile}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">{ctx.description}</p>
        </div>

        {/* Score grid */}
        <ScoreGrid
          overall={debrief.overallScore}
          skills={skillScores}
          openingLine={openingLine}
          outcome={session.outcome ?? "partial"}
          xpAwarded={debrief.xpAwarded}
        />

        {/* Key moments timeline */}
        <ReplayTimeline moments={keyMoments} />

        {/* Missed opportunities + closing note */}
        <MissedOpportunities
          opportunities={missedOpportunities}
          closingNote={closingNote}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/arena"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-center text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            New scenario
          </Link>
        </div>
      </div>
    </div>
  )
}
