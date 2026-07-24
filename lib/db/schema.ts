/**
 * AIGraph database schema (phase 1) — Drizzle / PostgreSQL.
 *
 * Translated from Repo/docs/ai-talent-graph-planv0.7.md §2 (Database Schema).
 * Principles (plan §1):
 *   - Every table carries `org_id` where it makes sense; phase 1 scopes all
 *     queries to a single 'main-org' constant (no multi-tenancy UI yet).
 *   - Column names are snake_case (CODE_CONVENTIONS §1); TS keys are camelCase.
 *   - `role_badge` and `building_status` are COMPUTED, not stored (see plan notes).
 *
 * Deviation flagged for human review: the plan's `users` table has no profile
 * URL handle, but the public route is /u/[username]. Added `username` (unique,
 * nullable — populated during onboarding) so profiles are addressable.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  unique,
} from 'drizzle-orm/pg-core';

/* ────────────────────────────── Enums ────────────────────────────── */

export const userStatus = pgEnum('user_status', ['invited', 'active', 'inactive']);
export const onboardingChoice = pgEnum('onboarding_choice', ['builder', 'domain_expert', 'hybrid']);
export const onboardingConfidence = pgEnum('onboarding_confidence', ['high', 'medium', 'low', 'unknown']);
export const skillCategory = pgEnum('skill_category', ['language', 'framework', 'tool', 'concept', 'ai_tool']);
export const verificationSource = pgEnum('verification_source', ['ai_repo_analysis', 'manual']);
export const projectStatus = pgEnum('project_status', ['draft', 'published']);
export const projectStage = pgEnum('project_stage', ['experiment', 'weekend_hack', 'building', 'shipped', 'maintained']);
export const verificationStatus = pgEnum('verification_status', ['pending', 'success', 'failed']);
export const activityEventType = pgEnum('activity_event_type', ['commit', 'release', 'star_milestone', 'fork_milestone']);
export const personaHint = pgEnum('persona_hint', ['builder', 'domain_expert', 'hybrid', 'unknown']);
export const invitationStatus = pgEnum('invitation_status', ['pending', 'accepted', 'expired']);
export const challengeStatus = pgEnum('challenge_status', ['pending_review', 'active', 'archived', 'rejected']);
export const problemStatus = pgEnum('problem_status', ['pending_review', 'active', 'resolved', 'archived', 'rejected']);
// IP position a Problem declares up front, so a builder sees the ownership terms
// before investing work: the developer keeps it, the organization owns it, or shared.
export const ipTerms = pgEnum('ip_terms', ['developer', 'organization', 'shared']);
// Leaderboard group == the computed role_badge (builder / domain_expert / hybrid).
// Mirrored as a DB enum only so frozen weekly snapshots are self-describing.
export const leaderboardGroup = pgEnum('leaderboard_group', ['builder', 'domain_expert', 'hybrid']);

/* ─────────────────────────────── Orgs ────────────────────────────── */

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────────────────────── Users ───────────────────────────── */

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    email: text('email').notNull().unique(),
    username: text('username').unique(), // profile handle for /u/[username]
    name: text('name').notNull(),
    roleTitle: text('role_title'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    githubUsername: text('github_username'),
    linkedinUrl: text('linkedin_url'),
    status: userStatus('status').default('invited').notNull(),
    isAdmin: boolean('is_admin').default(false).notNull(),
    passwordHash: text('password_hash'), // set only for accounts that can sign in

    onboardingChoice: onboardingChoice('onboarding_choice'),
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    onboardingConfidence: onboardingConfidence('onboarding_confidence'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
  },
  (t) => [index('users_org_idx').on(t.orgId)],
);

/* ─────────────────────── Skills & user skills ────────────────────── */

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: skillCategory('category').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
});

export const userSkills = pgTable(
  'user_skills',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
    claimedLevel: integer('claimed_level').notNull().default(1), // 1-5, validated at app layer (Zod)
    verified: boolean('verified').notNull().default(false),
    verificationSource: verificationSource('verification_source'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })],
);

/* ────────────────── Domains & domain expertise (DE persona) ──────── */

export const domains = pgTable('domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // 'hr', 'finance', ... — matches challenges.slug
  name: text('name').notNull(), // 'منابع انسانی · Human Resources'
  description: text('description'),
});

export const userDomainExpertise = pgTable(
  'user_domain_expertise',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    domainId: uuid('domain_id').notNull().references(() => domains.id, { onDelete: 'cascade' }),
    yearsExperience: integer('years_experience'),
    notes: text('notes'), // max 200 chars, enforced at app layer
  },
  (t) => [primaryKey({ columns: [t.userId, t.domainId] })],
);

/* ───────────────────────────── Projects ──────────────────────────── */

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }), // owner's org (phase-1: always main-org)
    title: text('title').notNull(),
    description: text('description').notNull(),
    githubUrl: text('github_url'),
    demoUrl: text('demo_url'),
    coverImageUrl: text('cover_image_url'),
    isPersonalProjectConfirmed: boolean('is_personal_project_confirmed').notNull().default(false), // IP disclaimer — legal safeguard, never bypass
    status: projectStatus('status').notNull().default('draft'),
    stage: projectStage('stage').notNull().default('experiment'),
    upvoteCount: integer('upvote_count').notNull().default(0), // denormalized
    githubMetadata: jsonb('github_metadata').$type<Record<string, unknown>>(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    pendingVerificationAt: timestamp('pending_verification_at', { withTimezone: true }), // queue marker for the verification cron
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('projects_user_idx').on(t.userId),
    // Directory (published, most-recent) + leaderboard publish-window scans.
    index('projects_status_created_idx').on(t.status, t.createdAt),
  ],
);

export const projectSkills = pgTable(
  'project_skills',
  {
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.skillId] })],
);

export const projectAiTools = pgTable(
  'project_ai_tools',
  {
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    toolSlug: text('tool_slug').notNull(), // 'cursor', 'claude-code', 'lovable', 'v0', 'bolt'
  },
  (t) => [primaryKey({ columns: [t.projectId, t.toolSlug] })],
);

/* ─────────────── AI verification & build-in-public activity ──────── */

export const verificationRuns = pgTable('verification_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  llmProvider: text('llm_provider').notNull(),
  llmModel: text('llm_model').notNull(),
  inputSummary: text('input_summary'),
  output: jsonb('output').$type<Record<string, unknown>>(),
  status: verificationStatus('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const projectActivity = pgTable(
  'project_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    eventType: activityEventType('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('project_activity_project_occurred_idx').on(t.projectId, t.occurredAt),
    index('project_activity_occurred_idx').on(t.occurredAt),
  ],
);

/* ───────────────────────────── Badges ────────────────────────────── */

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  iconUrl: text('icon_url'),
  criteria: jsonb('criteria').$type<Record<string, unknown>>(),
});

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    badgeId: uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

/* ─────────────────────────── Invitations ─────────────────────────── */

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invitedBy: uuid('invited_by').references(() => users.id),
  personaHint: personaHint('persona_hint').notNull().default('unknown'),
  status: invitationStatus('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ─── Audit logs — minimal; proves the IP disclaimer was accepted (plan) ─── */

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: text('action').notNull(), // 'disclaimer.accepted' | 'user.status_changed' | 'project.published'
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/* ─────────────── Challenges (domain buckets + problems) ──────────── */

export const challenges = pgTable(
  'challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    slug: text('slug').notNull(), // 'hr', 'finance', 'customer-support'
    title: text('title').notNull(),
    description: text('description').notNull(),
    sponsorTeam: text('sponsor_team'),
    proposedBy: uuid('proposed_by').references(() => users.id),
    status: challengeStatus('status').notNull().default('pending_review'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('challenges_org_status_idx').on(t.orgId, t.status),
    // slug is unique per org (schema-ready for multi-tenant), not globally —
    // this is also what makes the seed's onConflictDoNothing idempotent.
    unique('challenges_org_slug_unique').on(t.orgId, t.slug),
  ],
);

export const challengeProblems = pgTable(
  'challenge_problems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    proposedBy: uuid('proposed_by').references(() => users.id),
    status: problemStatus('status').notNull().default('pending_review'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    // IP terms declared by whoever defines the Problem (shown to builders before they submit).
    ipTerms: ipTerms('ip_terms').notNull().default('developer'),
    ipTermsNote: text('ip_terms_note'), // free-form clarification of the terms
    isSpotlight: boolean('is_spotlight').notNull().default(false),
    spotlightStartsAt: timestamp('spotlight_starts_at', { withTimezone: true }),
    spotlightEndsAt: timestamp('spotlight_ends_at', { withTimezone: true }),
    spotlightWinnerProjectId: uuid('spotlight_winner_project_id').references(() => projects.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('challenge_problems_challenge_status_idx').on(t.challengeId, t.status),
    index('challenge_problems_spotlight_idx').on(t.isSpotlight, t.spotlightEndsAt),
  ],
);

export const projectChallengeProblems = pgTable(
  'project_challenge_problems',
  {
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    challengeProblemId: uuid('challenge_problem_id').notNull().references(() => challengeProblems.id, { onDelete: 'cascade' }),
    solutionDescription: text('solution_description').notNull(), // markdown write-up: problem / approach / limitations
    ipTermsAcceptedAt: timestamp('ip_terms_accepted_at', { withTimezone: true }).notNull(), // when the builder accepted the Problem's IP terms
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.challengeProblemId] }),
    index('pcp_problem_idx').on(t.challengeProblemId),
    // Leaderboard: challenge-submission counts within a week window.
    index('pcp_created_idx').on(t.createdAt),
  ],
);

export const projectUpvotes = pgTable(
  'project_upvotes',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.projectId] }),
    // upvote_count recompute + hasUpvoted lookups filter by project_id.
    index('project_upvotes_project_idx').on(t.projectId),
    // Leaderboard: upvotes-received counts within a week window.
    index('project_upvotes_created_idx').on(t.createdAt),
  ],
);

/* Challenge follows — email digests on new/spotlighted problems (plan §3.5, Week 8) */
export const challengeFollows = pgTable(
  'challenge_follows',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.challengeId] })],
);

/* ───────────────────────── Weekly leaderboard ────────────────────────
 * Recognition board (not a permanent competitive ranking): standings reset
 * every Saturday→Saturday (Asia/Tehran, aligned to the Spotlight cycle) and
 * members are grouped by their computed role_badge. The live board for the
 * in-progress week is computed on the fly from raw timestamps; when a week
 * closes an admin "freezes" it into these rows (immutable record + the source
 * for the Top-of-the-Week badge). Reversed the plan's "no leaderboard in
 * phase 1" note — see CHANGELOG / plan v0.7 update.
 */
export const leaderboardSnapshots = pgTable(
  'leaderboard_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull().references(() => orgs.id),
    groupType: leaderboardGroup('group_type').notNull(),
    weekStart: timestamp('week_start', { withTimezone: true }).notNull(), // Saturday 00:00 Tehran (instant)
    weekEnd: timestamp('week_end', { withTimezone: true }).notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    rank: integer('rank').notNull(), // 1-based, within (group, week)
    score: integer('score').notNull(),
    breakdown: jsonb('breakdown').$type<Record<string, number>>().default({}).notNull(), // points by action, for transparency
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique('leaderboard_snapshots_unique').on(t.orgId, t.groupType, t.weekStart, t.userId),
    index('leaderboard_snapshots_week_idx').on(t.orgId, t.weekStart, t.groupType, t.rank),
  ],
);

/* Sessions — server-side credential-auth sessions; id is the opaque cookie token. */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('sessions_user_idx').on(t.userId),
    // Opportunistic GC sweeps expired rows by expires_at.
    index('sessions_expires_idx').on(t.expiresAt),
  ],
);

/**
 * NOTE: The `opportunities` / `applications` / `opportunity_skills` /
 * `notifications` tables (Sponsor job-posting + hiring-funnel loop) were
 * removed here. Product decision: phase 1 stays strictly internal talent
 * recognition (promote skills, encourage participation) — not a job board.
 * A published SaaS-facing recruiting loop makes companies uneasy about
 * exposing project details. See CHANGELOG.md for the removal entry.
 */
