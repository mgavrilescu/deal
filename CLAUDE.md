# CLAUDE.md — Voss Negotiation Trainer

## What this project is

A negotiation training web app built on the Chris Voss (Never Split the Difference)
method. Users practice against AI counterparts, receive real-time technique coaching,
and get a full session debrief. Two paths: Arena (user-defined scenario) and Campaign
(system-defined missions with narrative progression).

This is a **beta product** targeting a small group of early users. Build for that
scope. Do not over-engineer. Do not build for hypothetical scale.

---

## Meta-thinking rules — read these first, always

These rules govern every decision you make in this codebase.

**1. Simplest thing that works.**
Before writing any code, ask: what is the minimum implementation that satisfies this
requirement? If a Server Action + a single DB query solves it, that is the answer.
Do not introduce abstraction layers, utility wrappers, or helper files unless the
same logic is needed in 3+ places.

**2. No speculative infrastructure.**
Do not build things because they might be useful later. No generic hooks, no
abstract base classes, no "extensible" plugin systems. Build exactly what is needed
now. Refactor when the need is proven.

**3. Inline first.**
If a function is used in only one place, inline it. If a component is rendered in
only one place and is under ~80 lines, keep it in the parent file. Extract only
when the size or reuse justifies it.

**4. One file, one responsibility.**
Each file should do one clear thing. If you find yourself writing "and also" when
describing what a file does, split it.

**5. Security is not optional.**
Every Server Action must validate authentication before touching the database.
Never trust client-supplied IDs without verifying ownership. Validate all inputs
with Zod before they reach the DB. These checks are not optional even in early
versions.

**6. When in doubt, ask.**
If a requirement is ambiguous, stop and ask rather than guessing. A wrong assumption
compounds through every file that depends on it.

**7. Commit to conventions.**
Once a pattern is established (naming, file location, data shape), follow it
everywhere. Consistency is more valuable than local cleverness.

---

## Tech stack — exact versions, no substitutions

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2 |
| Language | TypeScript | strict mode |
| Styling | Tailwind CSS + shadcn/ui | latest |
| State | Zustand | latest |
| Animation | Framer Motion | latest |
| ORM | Drizzle ORM | latest |
| Database | Neon PostgreSQL | serverless |
| Auth | next-auth v5 | magic link (Resend) |
| AI | Anthropic SDK | claude-sonnet-4-6 |
| Validation | Zod | latest |
| Deployment | Vercel | — |

Do not introduce any dependency not listed here without explicit approval.
If you think a new dependency is needed, state what it is and why before adding it.

---

## Server Actions vs Route Handlers

**Default: Server Actions.**
Use Server Actions for all data mutations and fetches unless there is a specific
technical reason not to.

Server Actions handle:
- Creating and updating sessions
- Saving messages to the database
- Triggering debrief generation
- Updating user XP and reputation
- All mission and campaign state changes
- Auth-related mutations

**Exception: Route Handlers only for streaming.**
The live negotiation chat requires streaming the AI counterpart's response token
by token to the client. Server Actions do not support streaming responses.
Use a Route Handler at `app/api/chat/route.ts` for this purpose only.

The Coach AI (parallel technique analysis) fires after each user message and does
not stream — use a Server Action for this.

The Debrief AI fires once on session end and does not stream — use a Server Action.

**Rule of thumb:** if the word "stream" does not apply, it is a Server Action.

---

## Project structure

```
app/
  page.tsx                        # Home — path selector (Arena vs Campaign)
  layout.tsx                      # Root layout, auth provider, Zustand provider
  arena/
    page.tsx                      # Scenario setup form
    [sessionId]/
      page.tsx                    # Live negotiation screen
      debrief/
        page.tsx                  # Post-session debrief
  campaign/
    page.tsx                      # Mission board
    [missionId]/
      brief/page.tsx              # Mission briefing screen
      play/page.tsx               # Live negotiation screen (campaign)
      debrief/page.tsx            # Post-session debrief (campaign)
  api/
    chat/route.ts                 # ONLY route handler — SSE streaming counterpart AI
    auth/[...nextauth]/route.ts   # next-auth handler

components/
  negotiation/
    ChatInterface.tsx             # Message list + input
    TensionMeter.tsx              # Live tension bar
    TechniqueTag.tsx              # Per-message technique badge
    CoachSidebar.tsx              # Real-time coaching panel
  campaign/
    MissionBoard.tsx              # Grid of mission cards
    MissionCard.tsx               # Single mission card
    BriefingScreen.tsx            # Pre-mission dossier
  debrief/
    ScoreGrid.tsx                 # Skill score cards
    ReplayTimeline.tsx            # Annotated exchange list
    MissedOpportunities.tsx       # Alternative response panel
  ui/                             # shadcn/ui components only

lib/
  db.ts                           # Neon + Drizzle client (singleton)
  claude.ts                       # Anthropic SDK wrapper — one place to swap models
  prompts.ts                      # All system prompts — counterpart, coach, debrief
  scoring.ts                      # Voss technique taxonomy + scoring logic
  missions.ts                     # Mission seed data (v1: 2-3 missions)
  auth.ts                         # next-auth v5 config (magic link via Resend)
  validations.ts                  # Zod schemas for all inputs

store/
  sessionStore.ts                 # Active negotiation state (Zustand)
  userStore.ts                    # User profile + XP (Zustand)

db/
  schema.ts                       # Drizzle schema — single source of truth
  migrations/                     # Generated by drizzle-kit

actions/
  session.ts                      # createSession, endSession, getSession
  messages.ts                     # saveMessage, getMessages
  coach.ts                        # analyzeMessage (calls Coach AI)
  debrief.ts                      # generateDebrief (calls Debrief AI)
  missions.ts                     # getMissions, unlockMission
  user.ts                         # getUser, updateXP, updateReputation
```

---

## Database schema — source of truth

All DB changes go through `db/schema.ts` and Drizzle migrations.
Never modify the database directly. Never write raw SQL outside of Drizzle queries.

```typescript
// db/schema.ts — canonical shape

users {
  id: uuid PK
  email: text unique not null
  name: text
  reputation_title: text default 'Rookie'
  xp_total: integer default 0
  created_at: timestamptz
}

sessions {
  id: uuid PK
  user_id: uuid FK → users.id
  path: 'arena' | 'campaign'
  mission_id: uuid FK? → missions.id   // null for arena sessions
  scenario_context: jsonb              // {role, counterpart, goal, description}
  difficulty: 'rookie' | 'negotiator' | 'tactical' | 'hostage'
  status: 'active' | 'complete' | 'abandoned'
  outcome: 'win' | 'loss' | 'partial' | null
  tension_history: jsonb               // number[] — one value per exchange
  started_at: timestamptz
  ended_at: timestamptz nullable
}

messages {
  id: uuid PK
  session_id: uuid FK → sessions.id   // indexed
  role: 'user' | 'counterpart'
  content: text
  sequence: integer
  techniques_detected: jsonb           // string[]
  techniques_missed: jsonb             // string[]
  coach_note: text nullable
  tension_delta: float nullable
  black_swan_revealed: boolean default false
  created_at: timestamptz
}

missions {
  id: uuid PK
  slug: text unique                    // e.g. 'collapsing-deal'
  sector: 'corporate' | 'diplomatic' | 'crisis' | 'street'
  title: text
  brief: jsonb                         // {subtitle, description, intel_cards[], intel_gaps[]}
  counterpart_prompt: text             // system prompt for AI counterpart role
  black_swans: jsonb                   // [{fact, trigger_condition}]
  difficulty: 1 | 2 | 3 | 4
  xp_reward: integer
  unlock_requires: uuid[]              // mission IDs that must be completed first
  consequence_mission_id: uuid nullable // spawned on outcome: 'loss'
  sort_order: integer
}

debriefs {
  id: uuid PK
  session_id: uuid FK unique → sessions.id
  overall_score: integer               // 0–100
  skill_scores: jsonb                  // {empathy, frame, calibrated_q, audit} each 0–10
  key_moments: jsonb                   // [{sequence, exchange, techniques, coach_note, type}]
  missed_opportunities: jsonb          // [{sequence, what_happened, better_response}]
  black_swans_found: integer
  xp_awarded: integer
  created_at: timestamptz
}

// Join table: tracks which missions a user has completed
user_mission_progress {
  user_id: uuid FK → users.id
  mission_id: uuid FK → missions.id
  completed_at: timestamptz
  outcome: 'win' | 'loss' | 'partial'
  best_score: integer
  PRIMARY KEY (user_id, mission_id)
}
```

---

## AI layer — three roles, one wrapper

All AI calls go through `lib/claude.ts`. This is the only file that imports the
Anthropic SDK. If the model or provider changes, only this file changes.

```typescript
// lib/claude.ts — shape only, not full implementation
const MODEL = "claude-sonnet-4-6"

export async function streamCounterpart(...)   // streaming — used by Route Handler only
export async function runCoach(...)            // non-streaming — used by Server Action
export async function runDebrief(...)          // non-streaming — used by Server Action
```

All system prompts live in `lib/prompts.ts`. No prompt strings anywhere else.

### AI role contracts

**Counterpart** (`streamCounterpart`)
- Input: session context (scenario or mission), full conversation history, difficulty
- Behavior: plays the opposing party. Realistic resistance calibrated to difficulty.
  At higher difficulties, anchors aggressively and withholds black swan information
  unless the user asks exactly the right calibrated question.
- Language: responds in the same language the user writes in. Default English.
- Output: streamed text + a JSON metadata block at end of stream:
  `{tension_delta: number, black_swan_revealed: boolean}`

**Coach** (`runCoach`)
- Input: the user's last message only (not full history — keep it fast)
- Behavior: Voss technique classifier. Identifies which techniques were used and
  which were missed given the conversational context.
- Output: structured JSON only — never prose:
  `{detected: string[], missed: string[], note: string, tension_impact: 'up'|'down'|'neutral'}`

**Debrief** (`runDebrief`)
- Input: full transcript with all coach tags attached, session metadata
- Behavior: comprehensive post-session analysis. Identifies key moments, scores
  each Voss dimension, generates alternative responses for missed opportunities.
- Output: structured JSON matching the `debriefs` schema exactly.
  Validate output with Zod before writing to DB.

---

## Voss technique taxonomy

The Coach and Debrief AI score against these techniques only.
This list is the canonical reference — do not add or remove without updating prompts.

```
DETECTED (positive):
  label              — "It sounds like / It seems like / It feels like..."
  mirror             — repeat last 1-3 words as a question
  calibrated_q       — "How / What" questions that invite elaboration
  accusation_audit   — preemptively names negatives they might feel
  tactical_silence   — deliberate pause after counterpart speaks
  that_is_right      — draws out "that's right" not "you're right"
  no_oriented_q      — "Is it ridiculous to..." framing

MISSED (negative signals):
  compromised_early  — offered concession before anchoring
  yes_ladder         — asked questions fishing for "yes"
  lost_frame         — shifted from curiosity to justification
  counter_anchored   — responded to anchor with counter instead of label
  gave_away_batna    — revealed walk-away position
  emotional_reaction — responded emotionally rather than tactically
```

---

## Security rules — non-negotiable

These apply to every Server Action and Route Handler without exception.

```typescript
// Every Server Action starts with this pattern — no exceptions
export async function someAction(input: unknown) {
  // 1. Auth check first
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // 2. Validate input with Zod
  const validated = SomeInputSchema.parse(input)

  // 3. Verify ownership before any DB read/write
  const record = await db.query.sessions.findFirst({
    where: eq(sessions.id, validated.sessionId)
  })
  if (!record || record.userId !== session.user.id) {
    throw new Error("Forbidden")
  }

  // 4. Now do the work
}
```

Additional rules:
- Never expose internal IDs in client-facing error messages
- Never log full conversation content to Vercel logs (privacy)
- Rate-limit the `/api/chat` route — max 1 active stream per user at a time
- Sanitize all user text before passing to AI prompts (strip prompt injection attempts)
- The `counterpart_prompt` and `black_swans` fields from missions are
  server-only — never sent to the client

---

## Environment variables

```bash
# Database
DATABASE_URL="postgresql://..."          # Neon connection string

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Auth (next-auth v5 + Resend magic link)
AUTH_SECRET="..."
AUTH_RESEND_KEY="..."                    # Resend API key for magic link emails
AUTH_EMAIL_FROM="noreply@yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
```

---

## Build order for v1

Follow this order strictly. Do not jump ahead.
Each step must be working and committed before the next begins.

```
Step 1 — Foundation
  [ ] Drizzle schema + first migration (all tables)
  [ ] Neon connection verified
  [ ] next-auth v5 magic link working end-to-end
  [ ] Authenticated user stored in users table on first login

Step 2 — Arena path (proves the full loop)
  [ ] Scenario setup form → creates session in DB
  [ ] Live negotiation screen renders
  [ ] /api/chat route streams counterpart AI response
  [ ] User messages saved to DB via Server Action
  [ ] Counterpart messages saved to DB via Server Action
  [ ] Coach Server Action fires after each user message
  [ ] Technique tags render in sidebar
  [ ] Tension meter updates from tension_delta
  [ ] Session end → generateDebrief Server Action
  [ ] Debrief screen renders from DB data

Step 3 — Campaign path (adds mission layer)
  [ ] Seed 2-3 missions into DB
  [ ] Mission board renders with correct lock/unlock state
  [ ] Briefing screen renders from mission.brief
  [ ] Campaign play screen reuses Arena negotiation loop
  [ ] Mission outcome → XP update → reputation recalc
  [ ] Consequence mission unlocks on loss (if configured)

Step 4 — Polish for beta
  [ ] Loading states on all async operations
  [ ] Error boundaries on negotiation screen
  [ ] Empty states on mission board
  [ ] Mobile-responsive layout check
  [ ] Basic rate limiting on /api/chat
  [ ] Verify auth security on all Server Actions
```

---

## Naming conventions

- **Files:** kebab-case for all files (`session-store.ts`, `mission-card.tsx`)
- **Components:** PascalCase exports (`export default function MissionCard`)
- **Server Actions:** verb-first camelCase (`createSession`, `saveMessage`, `generateDebrief`)
- **DB columns:** snake_case in schema, camelCase in TypeScript via Drizzle mapping
- **Zod schemas:** PascalCase + Schema suffix (`CreateSessionSchema`, `SaveMessageSchema`)
- **Constants:** UPPER_SNAKE_CASE (`MODEL`, `MAX_STREAM_DURATION`)

---

## What v1 is NOT

Do not build these. They are not in scope.

- User profiles page
- Session history / dashboard
- Social features (sharing results, leaderboards)
- Payment or subscription logic
- Admin panel for mission management
- Mobile app
- Localization / i18n system
- Analytics beyond what Vercel provides by default

If a feature is not in the build order above, it does not exist yet.