"use server"

import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sessions } from "@/db/schema"
import { CreateSessionSchema } from "@/lib/validations"

export async function createSession(formData: FormData) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const raw = {
    userRole: formData.get("userRole"),
    counterpartProfile: formData.get("counterpartProfile"),
    goal: formData.get("goal"),
    scenarioDescription: formData.get("scenarioDescription"),
    difficulty: formData.get("difficulty"),
  }

  const validated = CreateSessionSchema.parse(raw)

  const [inserted] = await db
    .insert(sessions)
    .values({
      userId: authSession.user.id,
      path: "arena",
      scenarioContext: {
        userRole: validated.userRole,
        counterpartProfile: validated.counterpartProfile,
        goal: validated.goal,
        description: validated.scenarioDescription,
      },
      difficulty: validated.difficulty,
    })
    .returning({ id: sessions.id })

  redirect(`/arena/${inserted.id}`)
}

export async function getSession(sessionId: string) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }

  return session
}

export async function endSession(sessionId: string) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }

  await db
    .update(sessions)
    .set({ status: "complete", endedAt: new Date() })
    .where(eq(sessions.id, sessionId))
}

export async function updateTensionHistory(
  sessionId: string,
  delta: number
) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })

  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }

  const history = (session.tensionHistory as number[]) ?? []
  const last = history.length > 0 ? history[history.length - 1] : 0.5
  const next = Math.max(0, Math.min(1, last + delta))

  await db
    .update(sessions)
    .set({ tensionHistory: [...history, next] })
    .where(eq(sessions.id, sessionId))

  return next
}
