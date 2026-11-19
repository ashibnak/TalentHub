ALTER TABLE "ideas" ADD COLUMN "clinic_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "clinic_note" text;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "demo_project_id" uuid;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_demo_project_id_projects_id_fk" FOREIGN KEY ("demo_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "idea_members" (
  "idea_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "idea_members_idea_id_user_id_pk" PRIMARY KEY("idea_id","user_id")
);--> statement-breakpoint
ALTER TABLE "idea_members" ADD CONSTRAINT "idea_members_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_members" ADD CONSTRAINT "idea_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idea_members_user_idx" ON "idea_members" USING btree ("user_id");--> statement-breakpoint
CREATE TABLE "orbit_course_opens" (
  "user_id" uuid NOT NULL,
  "course_key" text NOT NULL,
  "opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "orbit_course_opens_user_id_course_key_pk" PRIMARY KEY("user_id","course_key")
);--> statement-breakpoint
ALTER TABLE "orbit_course_opens" ADD CONSTRAINT "orbit_course_opens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
