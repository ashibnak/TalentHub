DROP TABLE "applications" CASCADE;--> statement-breakpoint
DROP TABLE "notifications" CASCADE;--> statement-breakpoint
DROP TABLE "opportunities" CASCADE;--> statement-breakpoint
DROP TABLE "opportunity_skills" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "account_type";--> statement-breakpoint
DROP TYPE "public"."account_type";--> statement-breakpoint
DROP TYPE "public"."application_status";--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
DROP TYPE "public"."opportunity_status";