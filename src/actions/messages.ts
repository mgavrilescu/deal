"use server"

import { eq, asc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { messages, sessions } from "@/db/schema"
import { SaveMessageSchema } from "@/lib/validations"

export async function saveMessage(input: unknown) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const validated = SaveMessageSchema.parse(input)

  // Verify ownership
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, validated.sessionId),
  })
  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }

  // Compute next sequence number
  const existing = await db.query.messages.findMany({
    where: eq(messages.sessionId, validated.sessionId),
    orderBy: [asc(messages.sequence)],
  })
  const nextSequence = existing.length + 1

  const [saved] = await db
    .insert(messages)
    .values({
      sessionId: validated.sessionId,
      role: validated.role,
      content: validated.content,
      sequence: nextSequence,
      tensionDelta: validated.tensionDelta ?? null,
      blackSwanRevealed: validated.blackSwanRevealed ?? false,
    })
    .returning()

  return saved
}

export async function getMessages(sessionId: string) {
  const authSession = await auth()
  if (!authSession?.user?.id) throw new Error("Unauthorized")

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })
  if (!session || session.userId !== authSession.user.id) {
    throw new Error("Not found")
  }

  return db.query.messages.findMany({
    where: eq(messages.sessionId, sessionId),
    orderBy: [asc(messages.sequence)],
  })
}
