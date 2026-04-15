import Anthropic from "@anthropic-ai/sdk"
import type { ArenaContext, CoachContext, DebriefContext } from "@/lib/prompts"
import {
  buildCounterpartPrompt,
  buildCoachPrompt,
  buildDebriefPrompt,
} from "@/lib/prompts"

const MODEL = "claude-sonnet-4-6"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string
}

// Streaming counterpart — used by the /api/chat route handler only.
// Returns a ReadableStream of text chunks. The caller is responsible for
// consuming it and parsing the <metadata> block at the end.
export function streamCounterpart(
  systemPrompt: string,
  history: ConversationMessage[]
): ReadableStream<string> {
  return new ReadableStream({
    async start(controller) {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: history,
      })

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(chunk.delta.text)
        }
      }
      controller.close()
    },
  })
}

// Builds the system prompt for arena sessions and calls streamCounterpart.
export function streamArenaCounterpart(
  ctx: ArenaContext,
  history: ConversationMessage[]
): ReadableStream<string> {
  return streamCounterpart(buildCounterpartPrompt(ctx), history)
}

// Non-streaming coach analysis. Returns structured JSON.
export async function runCoach(ctx: CoachContext): Promise<{
  detected: string[]
  missed: string[]
  note: string
  tension_impact: "up" | "down" | "neutral"
}> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: buildCoachPrompt(ctx) }],
  })

  const text =
    message.content[0].type === "text" ? message.content[0].text : ""

  return JSON.parse(text)
}

// Non-streaming debrief generation. Returns structured JSON.
export async function runDebrief(ctx: DebriefContext): Promise<unknown> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: buildDebriefPrompt(ctx) }],
  })

  const text =
    message.content[0].type === "text" ? message.content[0].text : ""

  return JSON.parse(text)
}
