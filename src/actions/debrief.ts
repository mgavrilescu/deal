"use server"

import { eq, asc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sessions, messages, debriefs, users } from "@/db/schema"
import { runDebrief } from "@/lib/claude"
import { DebriefOutputSchema } from "@/lib/validations"
import type { DebriefContext, TranscriptMessage } from "@/lib/prompts"

export async function generateDebrief(sessionId: string) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })
  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }
  if (session.status === "complete") {
    // Already done — debrief was generated; just return
    return
  }

  const dbMessages = await db.query.messages.findMany({
    where: eq(messages.sessionId, sessionId),
    orderBy: [asc(messages.sequence)],
  })

  const ctx = session.scenarioContext as {
    userRole: string
    counterpartProfile: string
    goal: string
    description: string
  }

  const transcript: TranscriptMessage[] = dbMessages.map((m) => ({
    role: m.role as "user" | "counterpart",
    content: m.content,
    sequence: m.sequence,
    techniquesDetected: (m.techniquesDetected as string[]) ?? [],
    techniquesMissed: (m.techniquesMissed as string[]) ?? [],
    coachNote: m.coachNote ?? null,
    tensionDelta: m.tensionDelta ?? null,
    blackSwanRevealed: m.blackSwanRevealed,
  }))

  const debriefCtx: DebriefContext = {
    transcript,
    scenarioDescription: ctx.description,
    difficulty: session.difficulty as DebriefContext["difficulty"],
    path: session.path as "arena" | "campaign",
  }

  const raw = await runDebrief(debriefCtx)
  const result = DebriefOutputSchema.parse(raw)

  // Write debrief row — opening_line and closing_note piggyback on skill_scores jsonb
  await db.insert(debriefs).values({
    sessionId,
    overallScore: result.overall_score,
    skillScores: {
      ...result.skill_scores,
      opening_line: result.opening_line,
      closing_note: result.closing_note,
    },
    keyMoments: result.key_moments,
    missedOpportunities: result.missed_opportunities,
    blackSwansFound: result.black_swans_found,
    xpAwarded: result.xp_awarded,
  })

  // Mark session complete
  await db
    .update(sessions)
    .set({
      status: "complete",
      outcome: result.outcome,
      endedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))

  // Award XP to user — fetch current, then add
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, authSession.user.id),
  })
  if (userRow) {
    await db
      .update(users)
      .set({ xpTotal: userRow.xpTotal + result.xp_awarded })
      .where(eq(users.id, authSession.user.id))
  }
}

export async function getDebrief(sessionId: string) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })
  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }

  return db.query.debriefs.findFirst({
    where: eq(debriefs.sessionId, sessionId),
  })
}
