CREATE TYPE "public"."lesson_kind" AS ENUM('course', 'article', 'doc', 'tip');--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "kind" "lesson_kind" DEFAULT 'course' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "topics" text[] DEFAULT '{}' NOT NULL;