import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

// ─── next-auth required tables ────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  reputationTitle: text("reputation_title").default("Rookie").notNull(),
  xpTotal: integer("xp_total").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
)

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
)

// ─── App enums ────────────────────────────────────────────────────────────────

export const sessionPathEnum = pgEnum("session_path", ["arena", "campaign"])
export const difficultyEnum = pgEnum("difficulty_level", [
  "rookie",
  "negotiator",
  "tactical",
  "hostage",
])
export const sessionStatusEnum = pgEnum("session_status", [
  "active",
  "complete",
  "abandoned",
])
export const outcomeEnum = pgEnum("outcome", ["win", "loss", "partial"])
export const sectorEnum = pgEnum("sector", [
  "corporate",
  "diplomatic",
  "crisis",
  "street",
])
export const messageRoleEnum = pgEnum("message_role", ["user", "counterpart"])

// ─── App tables ───────────────────────────────────────────────────────────────

export const missions = pgTable("missions", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  sector: sectorEnum("sector").notNull(),
  title: text("title").notNull(),
  brief: jsonb("brief").notNull(),
  counterpartPrompt: text("counterpart_prompt").notNull(),
  blackSwans: jsonb("black_swans").notNull().default([]),
  difficulty: integer("difficulty").notNull(),
  xpReward: integer("xp_reward").notNull(),
  unlockRequires: jsonb("unlock_requires").notNull().default([]),
  consequenceMissionId: uuid("consequence_mission_id"),
  sortOrder: integer("sort_order").notNull(),
})

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  path: sessionPathEnum("path").notNull(),
  missionId: uuid("mission_id").references(() => missions.id),
  scenarioContext: jsonb("scenario_context").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  status: sessionStatusEnum("status").notNull().default("active"),
  outcome: outcomeEnum("outcome"),
  tensionHistory: jsonb("tension_history").notNull().default([]),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
})

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  sequence: integer("sequence").notNull(),
  techniquesDetected: jsonb("techniques_detected").notNull().default([]),
  techniquesMissed: jsonb("techniques_missed").notNull().default([]),
  coachNote: text("coach_note"),
  tensionDelta: real("tension_delta"),
  blackSwanRevealed: boolean("black_swan_revealed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const debriefs = pgTable("debriefs", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .unique()
    .references(() => sessions.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").notNull(),
  skillScores: jsonb("skill_scores").notNull(),
  keyMoments: jsonb("key_moments").notNull().default([]),
  missedOpportunities: jsonb("missed_opportunities").notNull().default([]),
  blackSwansFound: integer("black_swans_found").notNull().default(0),
  xpAwarded: integer("xp_awarded").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export const userMissionProgress = pgTable(
  "user_mission_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    outcome: outcomeEnum("outcome").notNull(),
    bestScore: integer("best_score").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.missionId] })]
)
