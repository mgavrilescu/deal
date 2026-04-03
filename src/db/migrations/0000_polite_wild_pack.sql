CREATE TYPE "public"."difficulty_level" AS ENUM('rookie', 'negotiator', 'tactical', 'hostage');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'counterpart');--> statement-breakpoint
CREATE TYPE "public"."outcome" AS ENUM('win', 'loss', 'partial');--> statement-breakpoint
CREATE TYPE "public"."sector" AS ENUM('corporate', 'diplomatic', 'crisis', 'street');--> statement-breakpoint
CREATE TYPE "public"."session_path" AS ENUM('arena', 'campaign');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'complete', 'abandoned');--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "debriefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"skill_scores" jsonb NOT NULL,
	"key_moments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missed_opportunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"black_swans_found" integer DEFAULT 0 NOT NULL,
	"xp_awarded" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debriefs_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"sequence" integer NOT NULL,
	"techniques_detected" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"techniques_missed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"coach_note" text,
	"tension_delta" real,
	"black_swan_revealed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"sector" "sector" NOT NULL,
	"title" text NOT NULL,
	"brief" jsonb NOT NULL,
	"counterpart_prompt" text NOT NULL,
	"black_swans" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" integer NOT NULL,
	"xp_reward" integer NOT NULL,
	"unlock_requires" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consequence_mission_id" uuid,
	"sort_order" integer NOT NULL,
	CONSTRAINT "missions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"path" "session_path" NOT NULL,
	"mission_id" uuid,
	"scenario_context" jsonb NOT NULL,
	"difficulty" "difficulty_level" NOT NULL,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"outcome" "outcome",
	"tension_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_mission_progress" (
	"user_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" "outcome" NOT NULL,
	"best_score" integer NOT NULL,
	CONSTRAINT "user_mission_progress_user_id_mission_id_pk" PRIMARY KEY("user_id","mission_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"reputation_title" text DEFAULT 'Rookie' NOT NULL,
	"xp_total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debriefs" ADD CONSTRAINT "debriefs_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mission_progress" ADD CONSTRAINT "user_mission_progress_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;