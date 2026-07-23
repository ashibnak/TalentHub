CREATE TYPE "public"."leaderboard_group" AS ENUM('builder', 'domain_expert', 'hybrid');--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"group_type" "leaderboard_group" NOT NULL,
	"week_start" timestamp with time zone NOT NULL,
	"week_end" timestamp with time zone NOT NULL,
	"user_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"score" integer NOT NULL,
	"breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_snapshots_unique" UNIQUE("org_id","group_type","week_start","user_id")
);
--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_week_idx" ON "leaderboard_snapshots" USING btree ("org_id","week_start","group_type","rank");