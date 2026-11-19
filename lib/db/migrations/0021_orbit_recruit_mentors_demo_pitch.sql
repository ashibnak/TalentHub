CREATE TYPE "public"."mentor_role" AS ENUM('product', 'ai_architecture', 'engineering', 'data', 'security', 'pilot');--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "demo_score_function" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "demo_score_value" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "demo_score_security" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "demo_score_readiness" integer;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "manager_pitch_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "manager_pitch_to" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_demo_score_function_range" CHECK ("demo_score_function" IS NULL OR "demo_score_function" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_demo_score_value_range" CHECK ("demo_score_value" IS NULL OR "demo_score_value" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_demo_score_security_range" CHECK ("demo_score_security" IS NULL OR "demo_score_security" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_demo_score_readiness_range" CHECK ("demo_score_readiness" IS NULL OR "demo_score_readiness" BETWEEN 1 AND 5);--> statement-breakpoint
CREATE TABLE "idea_mentors" (
  "idea_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "mentor_role" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "idea_mentors_idea_id_user_id_role_pk" PRIMARY KEY("idea_id","user_id","role")
);--> statement-breakpoint
ALTER TABLE "idea_mentors" ADD CONSTRAINT "idea_mentors_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_mentors" ADD CONSTRAINT "idea_mentors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_mentors_user_idx" ON "idea_mentors" USING btree ("user_id");
