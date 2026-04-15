import { NextRequest } from "next/server"
import { eq, asc } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { sessions, messages } from "@/db/schema"
import { streamArenaCounterpart } from "@/lib/claude"
import type { ArenaContext } from "@/lib/prompts"
import type { ConversationMessage } from "@/lib/claude"

// Sanitize user content to prevent prompt injection.
function sanitize(text: string): string {
  return text
    .replace(/<\/?[a-zA-Z][^>]*>/g, "") // strip HTML/XML tags
    .replace(/\[INST\]|\[\/INST\]|<\|system\|>|<\|user\|>/g, "") // strip common injection markers
    .trim()
}

// Active streams per user — enforces max 1 stream at a time.
const activeStreams = new Map<string, AbortController>()

export async function POST(req: NextRequest) {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }
  const userId = authSession.user.id

  const body = await req.json()
  const { sessionId } = body as { sessionId: string }

  if (!sessionId || typeof sessionId !== "string") {
    return new Response("Bad request", { status: 400 })
  }

  // Verify session ownership
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  })
  if (!session || session.userId !== userId) {
    return new Response("Not found", { status: 404 })
  }
  if (session.status !== "active") {
    return new Response("Session is not active", { status: 400 })
  }

  // Rate limit: abort any existing stream for this user
  const existing = activeStreams.get(userId)
  if (existing) existing.abort()
  const controller = new AbortController()
  activeStreams.set(userId, controller)

  // Load full message history
  const dbMessages = await db.query.messages.findMany({
    where: eq(messages.sessionId, sessionId),
    orderBy: [asc(messages.sequence)],
  })

  // Build history in Anthropic format
  const history: ConversationMessage[] = dbMessages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: sanitize(m.content),
  }))

  // Build scenario context from session
  const ctx = session.scenarioContext as {
    userRole: string
    counterpartProfile: string
    goal: string
    description: string
  }

  const arenaCtx: ArenaContext = {
    userRole: ctx.userRole,
    counterpartProfile: ctx.counterpartProfile,
    userGoal: ctx.goal,
    scenarioDescription: ctx.description,
    difficulty: session.difficulty as ArenaContext["difficulty"],
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(streamController) {
      let fullText = ""
      let aborted = false

      controller.signal.addEventListener("abort", () => {
        aborted = true
        streamController.close()
        activeStreams.delete(userId)
      })

      try {
        const counterpartStream = streamArenaCounterpart(arenaCtx, history)
        const reader = counterpartStream.getReader()

        while (true) {
          if (aborted) break
          const { done, value } = await reader.read()
          if (done) break
          fullText += value
          streamController.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: value })}\n\n`)
          )
        }

        // Parse metadata block from full text
        const metadataMatch = fullText.match(
          /<metadata>\s*(\{[\s\S]*?\})\s*<\/metadata>/
        )
        const textWithoutMetadata = fullText
          .replace(/<metadata>[\s\S]*?<\/metadata>/g, "")
          .trim()

        let tensionDelta = 0
        let blackSwanRevealed = false

        if (metadataMatch) {
          try {
            const meta = JSON.parse(metadataMatch[1])
            tensionDelta = typeof meta.tension_delta === "number" ? meta.tension_delta : 0
            blackSwanRevealed = meta.black_swan_revealed === true
          } catch {
            // malformed metadata — use defaults
          }
        }

        // Send done event with parsed metadata so client can persist
        if (!aborted) {
          streamController.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                text: textWithoutMetadata,
                tensionDelta,
                blackSwanRevealed,
              })}\n\n`
            )
          )
        }
      } catch (err) {
        if (!aborted) {
          streamController.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`)
          )
        }
        console.error("[chat/route] stream error:", err instanceof Error ? err.message : "unknown")
      } finally {
        if (!aborted) streamController.close()
        activeStreams.delete(userId)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
