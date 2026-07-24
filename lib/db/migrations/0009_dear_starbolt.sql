CREATE INDEX "pcp_created_idx" ON "project_challenge_problems" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "project_upvotes_project_idx" ON "project_upvotes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_upvotes_created_idx" ON "project_upvotes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "projects_status_created_idx" ON "projects" USING btree ("status","created_at");