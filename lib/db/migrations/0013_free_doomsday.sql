ALTER TABLE "user_skills" ADD COLUMN "verification_run_id" uuid;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD COLUMN "commit_sha" text;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD COLUMN "latency_ms" integer;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD COLUMN "total_tokens" integer;--> statement-breakpoint
ALTER TABLE "verification_runs" ADD COLUMN "attempts" integer;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_verification_run_id_verification_runs_id_fk" FOREIGN KEY ("verification_run_id") REFERENCES "public"."verification_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_runs_cache_idx" ON "verification_runs" USING btree ("github_url","commit_sha","status");--> statement-breakpoint
CREATE INDEX "verification_runs_project_idx" ON "verification_runs" USING btree ("project_id","created_at");