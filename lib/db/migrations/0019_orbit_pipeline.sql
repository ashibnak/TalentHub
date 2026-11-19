CREATE TYPE "public"."orbit_stage" AS ENUM('signal', 'screening', 'clinic', 'pitch', 'lab', 'demo', 'pilot', 'next');--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "current_workaround" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "why_agent" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "data_needed" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "team_capability" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "orbit_stage" "orbit_stage";--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "score_problem" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "score_agent_fit" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "score_prototype" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "score_security" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "score_measurable" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "score_implement" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "pitch_url" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "pilot_goal" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "pilot_scope" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "pilot_users" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "pilot_metrics" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "pilot_risks" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "pilot_decision" text;--> statement-breakpoint
UPDATE "ideas" SET "orbit_stage" = 'signal' WHERE "status" <> 'draft' AND "orbit_stage" IS NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_score_problem_range" CHECK ("score_problem" IS NULL OR "score_problem" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_score_agent_fit_range" CHECK ("score_agent_fit" IS NULL OR "score_agent_fit" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_score_prototype_range" CHECK ("score_prototype" IS NULL OR "score_prototype" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_score_security_range" CHECK ("score_security" IS NULL OR "score_security" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_score_measurable_range" CHECK ("score_measurable" IS NULL OR "score_measurable" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_score_implement_range" CHECK ("score_implement" IS NULL OR "score_implement" BETWEEN 1 AND 5);
