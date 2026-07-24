CREATE TYPE "public"."ip_terms" AS ENUM('developer', 'organization', 'shared');--> statement-breakpoint
ALTER TABLE "challenge_problems" ADD COLUMN "ip_terms" "ip_terms" DEFAULT 'developer' NOT NULL;--> statement-breakpoint
ALTER TABLE "challenge_problems" ADD COLUMN "ip_terms_note" text;--> statement-breakpoint
-- Add the two new columns NULLABLE first so existing rows aren't rejected …
ALTER TABLE "project_challenge_problems" ADD COLUMN "solution_description" text;--> statement-breakpoint
ALTER TABLE "project_challenge_problems" ADD COLUMN "ip_terms_accepted_at" timestamp with time zone;--> statement-breakpoint
-- … backfill: carry old submission_notes into solution_description, and accept
-- IP terms as of each row's created_at, so no data is lost …
UPDATE "project_challenge_problems" SET "solution_description" = COALESCE("submission_notes", '') WHERE "solution_description" IS NULL;--> statement-breakpoint
UPDATE "project_challenge_problems" SET "ip_terms_accepted_at" = "created_at" WHERE "ip_terms_accepted_at" IS NULL;--> statement-breakpoint
-- … then enforce NOT NULL to match the schema.
ALTER TABLE "project_challenge_problems" ALTER COLUMN "solution_description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_challenge_problems" ALTER COLUMN "ip_terms_accepted_at" SET NOT NULL;
