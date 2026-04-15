"use server"

import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { messages, sessions } from "@/db/schema"
import { runCoach } from "@/lib/claude"
import { AnalyzeMessageSchema } from "@/lib/validations"

export async function analyzeMessage(input: unknown) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const validated = AnalyzeMessageSchema.parse(input)

  // Verify session ownership
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, validated.sessionId),
  })
  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }

  // Verify message belongs to this session
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, validated.messageId),
  })
  if (!message || message.sessionId !== validated.sessionId) {
    throw new Error("Not found")
  }

  const result = await runCoach({
    userMessage: validated.userMessage,
    counterpartLastMessage: validated.counterpartLastMessage,
    sessionContext: validated.sessionContext,
  })

  await db
    .update(messages)
    .set({
      techniquesDetected: result.detected,
      techniquesMissed: result.missed,
      coachNote: result.note,
    })
    .where(eq(messages.id, validated.messageId))

  return result
}
