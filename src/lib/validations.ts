import { z } from "zod"

export const CreateSessionSchema = z.object({
  userRole: z.string().min(1).max(200),
  counterpartProfile: z.string().min(1).max(500),
  goal: z.string().min(1).max(500),
  scenarioDescription: z.string().min(1).max(1000),
  difficulty: z.enum(["rookie", "negotiator", "tactical", "hostage"]),
})

export const SaveMessageSchema = z.object({
  sessionId: z.string().uuid(),
  role: z.enum(["user", "counterpart"]),
  content: z.string().min(1),
  tensionDelta: z.number().nullable().optional(),
  blackSwanRevealed: z.boolean().optional(),
})

export const AnalyzeMessageSchema = z.object({
  messageId: z.string().uuid(),
  sessionId: z.string().uuid(),
  userMessage: z.string().min(1),
  counterpartLastMessage: z.string(),
  sessionContext: z.string(),
})

export const EndSessionSchema = z.object({
  sessionId: z.string().uuid(),
})

export const DebriefOutputSchema = z.object({
  overall_score: z.number().int().min(0).max(100),
  outcome: z.enum(["win", "loss", "partial"]),
  skill_scores: z.object({
    empathy: z.number().min(0).max(10),
    frame: z.number().min(0).max(10),
    calibrated_q: z.number().min(0).max(10),
    audit: z.number().min(0).max(10),
  }),
  opening_line: z.string(),
  key_moments: z.array(
    z.object({
      sequence: z.number(),
      type: z.enum(["highlight", "miss", "pivot"]),
      exchange_summary: z.string(),
      techniques_used: z.array(z.string()),
      techniques_missed: z.array(z.string()),
      why_it_mattered: z.string(),
      alternative_response: z.string().nullable(),
    })
  ),
  missed_opportunities: z.array(
    z.object({
      sequence: z.number(),
      what_happened: z.string(),
      better_response: z.string(),
    })
  ),
  black_swans_found: z.number().int().min(0).max(2),
  xp_awarded: z.number().int().min(0),
  closing_note: z.string(),
})

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>
export type SaveMessageInput = z.infer<typeof SaveMessageSchema>
export type AnalyzeMessageInput = z.infer<typeof AnalyzeMessageSchema>
export type DebriefOutput = z.infer<typeof DebriefOutputSchema>
