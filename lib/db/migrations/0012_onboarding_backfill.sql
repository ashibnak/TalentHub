-- Existing accounts predate the onboarding wizard — mark them complete so the
-- new requireUser funnel only catches invite-created users.
UPDATE "users" SET "onboarding_completed_at" = "created_at" WHERE "onboarding_completed_at" IS NULL;
