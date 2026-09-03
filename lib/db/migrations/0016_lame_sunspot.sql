CREATE TYPE "public"."tip_audience" AS ENUM('builder', 'domain_expert', 'all');--> statement-breakpoint
CREATE TYPE "public"."tip_category" AS ENUM('prompt_engineering', 'ai_tools', 'ai_in_domain', 'platform');--> statement-breakpoint
CREATE TABLE "tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "tip_category" NOT NULL,
	"audience" "tip_audience" DEFAULT 'all' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tips_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "tips_audience_idx" ON "tips" USING btree ("audience");