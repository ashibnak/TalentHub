CREATE TYPE "public"."activity_event_type" AS ENUM('commit', 'release', 'star_milestone', 'fork_milestone');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('pending_review', 'active', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."onboarding_choice" AS ENUM('builder', 'domain_expert', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."onboarding_confidence" AS ENUM('high', 'medium', 'low', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."persona_hint" AS ENUM('builder', 'domain_expert', 'hybrid', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."problem_status" AS ENUM('pending_review', 'active', 'resolved', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."project_stage" AS ENUM('experiment', 'weekend_hack', 'building', 'shipped', 'maintained');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('language', 'framework', 'tool', 'concept', 'ai_tool');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."verification_source" AS ENUM('ai_repo_analysis', 'manual');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text,
	"criteria" jsonb,
	CONSTRAINT "badges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "challenge_follows" (
	"user_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_follows_user_id_challenge_id_pk" PRIMARY KEY("user_id","challenge_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"proposed_by" uuid,
	"status" "problem_status" DEFAULT 'pending_review' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"is_spotlight" boolean DEFAULT false NOT NULL,
	"spotlight_starts_at" timestamp with time zone,
	"spotlight_ends_at" timestamp with time zone,
	"spotlight_winner_project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"sponsor_team" text,
	"proposed_by" uuid,
	"status" "challenge_status" DEFAULT 'pending_review' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "domains_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"invited_by" uuid,
	"persona_hint" "persona_hint" DEFAULT 'unknown' NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orgs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "project_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"event_type" "activity_event_type" NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_ai_tools" (
	"project_id" uuid NOT NULL,
	"tool_slug" text NOT NULL,
	CONSTRAINT "project_ai_tools_project_id_tool_slug_pk" PRIMARY KEY("project_id","tool_slug")
);
--> statement-breakpoint
CREATE TABLE "project_challenge_problems" (
	"project_id" uuid NOT NULL,
	"challenge_problem_id" uuid NOT NULL,
	"submission_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_challenge_problems_project_id_challenge_problem_id_pk" PRIMARY KEY("project_id","challenge_problem_id")
);
--> statement-breakpoint
CREATE TABLE "project_skills" (
	"project_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "project_skills_project_id_skill_id_pk" PRIMARY KEY("project_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "project_upvotes" (
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_upvotes_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"github_url" text,
	"demo_url" text,
	"cover_image_url" text,
	"is_personal_project_confirmed" boolean DEFAULT false NOT NULL,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"stage" "project_stage" DEFAULT 'experiment' NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"github_metadata" jsonb,
	"last_activity_at" timestamp with time zone,
	"pending_verification_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "skill_category" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "user_domain_expertise" (
	"user_id" uuid NOT NULL,
	"domain_id" uuid NOT NULL,
	"years_experience" integer,
	"notes" text,
	CONSTRAINT "user_domain_expertise_user_id_domain_id_pk" PRIMARY KEY("user_id","domain_id")
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"claimed_level" integer DEFAULT 1 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verification_source" "verification_source",
	"verified_at" timestamp with time zone,
	CONSTRAINT "user_skills_user_id_skill_id_pk" PRIMARY KEY("user_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"name" text NOT NULL,
	"role_title" text,
	"bio" text,
	"avatar_url" text,
	"github_username" text,
	"linkedin_url" text,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"onboarding_choice" "onboarding_choice",
	"onboarding_completed_at" timestamp with time zone,
	"onboarding_confidence" "onboarding_confidence",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"llm_provider" text NOT NULL,
	"llm_model" text NOT NULL,
	"input_summary" text,
	"output" jsonb,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_follows" ADD CONSTRAINT "challenge_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_follows" ADD CONSTRAINT "challenge_follows_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_problems" ADD CONSTRAINT "challenge_problems_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_problems" ADD CONSTRAINT "challenge_problems_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_problems" ADD CONSTRAINT "challenge_problems_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_problems" ADD CONSTRAINT "challenge_problems_spotlight_winner_project_id_projects_id_fk" FOREIGN KEY ("spotlight_winner_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_ai_tools" ADD CONSTRAINT "project_ai_tools_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_challenge_problems" ADD CONSTRAINT "project_challenge_problems_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_challenge_problems" ADD CONSTRAINT "project_challenge_problems_challenge_problem_id_challenge_problems_id_fk" FOREIGN KEY ("challenge_problem_id") REFERENCES "public"."challenge_problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_skills" ADD CONSTRAINT "project_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_upvotes" ADD CONSTRAINT "project_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_upvotes" ADD CONSTRAINT "project_upvotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domain_expertise" ADD CONSTRAINT "user_domain_expertise_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_domain_expertise" ADD CONSTRAINT "user_domain_expertise_domain_id_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD CONSTRAINT "verification_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_problems_challenge_status_idx" ON "challenge_problems" USING btree ("challenge_id","status");--> statement-breakpoint
CREATE INDEX "challenge_problems_spotlight_idx" ON "challenge_problems" USING btree ("is_spotlight","spotlight_ends_at");--> statement-breakpoint
CREATE INDEX "challenges_org_status_idx" ON "challenges" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "project_activity_project_occurred_idx" ON "project_activity" USING btree ("project_id","occurred_at");--> statement-breakpoint
CREATE INDEX "project_activity_occurred_idx" ON "project_activity" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "pcp_problem_idx" ON "project_challenge_problems" USING btree ("challenge_problem_id");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_org_idx" ON "users" USING btree ("org_id");