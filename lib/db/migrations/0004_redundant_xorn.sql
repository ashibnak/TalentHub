CREATE TYPE "public"."notification_type" AS ENUM('application_status', 'new_applicant', 'new_opportunity');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_skills" (
	"opportunity_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	CONSTRAINT "opportunity_skills_opportunity_id_skill_id_pk" PRIMARY KEY("opportunity_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_skills" ADD CONSTRAINT "opportunity_skills_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_skills" ADD CONSTRAINT "opportunity_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
INSERT INTO "opportunity_skills" ("opportunity_id", "skill_id")
SELECT o.id, s.id FROM "opportunities" o JOIN "skills" s
  ON s.slug IN ('python', 'rag', 'nlp', 'machine-learning', 'prompt-engineering')
WHERE o.title = 'مهندس هوش مصنوعی ارشد'
  AND o.sponsor_id = (SELECT id FROM "users" WHERE email = 'sepideh@aigraph.local')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "opportunity_skills" ("opportunity_id", "skill_id")
SELECT o.id, s.id FROM "opportunities" o JOIN "skills" s
  ON s.slug IN ('typescript', 'nextjs', 'react', 'tailwind-css')
WHERE o.title = 'توسعه‌دهنده‌ی فول‌استک محصول'
  AND o.sponsor_id = (SELECT id FROM "users" WHERE email = 'sepideh@aigraph.local')
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "opportunity_skills" ("opportunity_id", "skill_id")
SELECT o.id, s.id FROM "opportunities" o JOIN "skills" s
  ON s.slug IN ('python', 'sql', 'machine-learning', 'deep-learning')
WHERE o.title = 'تحلیل‌گر داده و مالی'
  AND o.sponsor_id = (SELECT id FROM "users" WHERE email = 'sepideh@aigraph.local')
ON CONFLICT DO NOTHING;
