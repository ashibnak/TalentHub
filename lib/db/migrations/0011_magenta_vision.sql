-- Add org_id NULLABLE first so existing rows aren't rejected, backfill each
-- project from its owner's org, then enforce NOT NULL to match the schema.
ALTER TABLE "projects" ADD COLUMN "org_id" uuid;--> statement-breakpoint
UPDATE "projects" p SET "org_id" = u."org_id" FROM "users" u WHERE u."id" = p."user_id";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "org_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
