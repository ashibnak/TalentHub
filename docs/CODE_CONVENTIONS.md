# AIGraph — Code Conventions

> Reference for backend/API/data code patterns. Complements DESIGN_SYSTEM.md (which covers UI/visual patterns only). Claude Code should read this before writing API routes, database queries, or business logic.

---

## 1. Naming conventions

```
Variables, functions     camelCase          userSkills, fetchProjects()
React components         PascalCase         ProjectCard, StatusPill
Files (components)       PascalCase.tsx     ProjectCard.tsx
Files (utilities/lib)    kebab-case.ts      github-activity.ts, role-badge.ts
Database tables/columns  snake_case         user_skills, is_personal_project_confirmed
API routes (folders)     kebab-case         /api/challenge-problems
Types/interfaces         PascalCase         type ProjectStage = ...
Enum values (DB)         snake_case         'weekend_hack', 'pending_review'
Enum values (UI display) Title Case string  'Weekend Hack' (translated at render time)
```

## 2. Import order

```ts
// 1. External packages
import { useState } from 'react';
import { z } from 'zod';

// 2. Internal absolute imports (@/ alias)
import { db } from '@/lib/db';
import { ProjectCard } from '@/components/molecules/ProjectCard';

// 3. Relative imports (same folder or nearby)
import { formatDate } from './utils';

// 4. Types (grouped last, or inline with `import type`)
import type { Project } from '@/lib/db/schema';
```

## 3. API route pattern

Every API route follows this shape — typed request, typed response, Zod validation, consistent error format:

```ts
// /app/api/projects/route.ts
import { z } from 'zod';
import { NextResponse } from 'next/server';

const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  githubUrl: z.string().url().optional(),
  isPersonalProjectConfirmed: z.literal(true), // must be explicitly true
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = CreateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const project = await createProject(parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error('[projects.create]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
```

Rules:
- Always `safeParse`, never throw raw Zod errors to the client
- Always wrap the actual logic in try/catch
- Log errors with a `[domain.action]` prefix for grep-ability
- Never leak internal error messages to the client — return a generic `error` code, log details server-side

## 4. Database query pattern (Drizzle)

Always scope to `org_id`, even in phase 1 with a single hardcoded org:

```ts
// /lib/db/queries/projects.ts
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const MAIN_ORG_ID = 'main-org'; // phase 1 constant — see PROJECT_PLAN.md principle 4

export async function getPublishedProjects() {
  return db
    .select()
    .from(projects)
    .where(and(eq(projects.orgId, MAIN_ORG_ID), eq(projects.status, 'published')));
}
```

Rules:
- Queries live in `/lib/db/queries/*.ts`, grouped by entity — not inline in API routes or components
- Always use typed Drizzle queries, never raw SQL unless there's a documented reason (e.g., a complex aggregate)
- Every query touching multi-row data must include the `org_id` filter, even though phase 1 has one org — this is what keeps phase 2 multi-tenancy a small change instead of a rewrite
- The org slug/id come from one place — `lib/db/queries/org.ts` (`MAIN_ORG_SLUG` and the cached `getMainOrgId()`). Import them; don't re-declare the `'main-org'` constant or re-query the id per module.
- Every table carries its own `org_id` (per CLAUDE.md). As of migration `0011`, `projects` does too (backfilled from the owner's org), so it scopes directly rather than transitively through `users`. New project inserts set `org_id` from `user.orgId` (now on `SessionUser`).

## 5. Error handling in UI

- User-facing errors → toast (see DESIGN_SYSTEM.md 6.4) with a short Persian message
- Form validation errors → inline below the field (see DESIGN_SYSTEM.md 5.2)
- Never show raw error objects, stack traces, or English error codes to end users
- Critical/destructive actions (delete, reject) → confirmation modal, not toast

## 6. Background jobs (cron-based, phase 1)

```ts
// /lib/jobs/scheduler.ts pattern
type Job = {
  name: string;
  schedule: string; // cron expression
  handler: () => Promise<void>;
};

// Each job logs start/end/error to stdout with a consistent prefix:
// [job:verification] started
// [job:verification] completed — 3 projects processed
// [job:verification] error — <details>
```

Rules:
- No BullMQ/Redis in phase 1 — see PROJECT_PLAN.md for rationale
- Every job must be idempotent (safe to re-run if it fails partway)
- Every job must log start, completion, and errors — this is the only observability we have without Sentry in phase 1

## 7. Testing

- Vitest for unit tests
- One test file per non-trivial utility or query function
- Minimum coverage: happy path + one error case
- Don't chase 100% coverage in phase 1 — prioritize testing verification logic, badge-awarding logic, and anything touching money/legal (the IP disclaimer flow)

```ts
// Example: /lib/users/role-badge.test.ts
import { describe, it, expect } from 'vitest';
import { computeRoleBadge } from './role-badge';

describe('computeRoleBadge', () => {
  it('returns "builder" for users with only technical skills', () => {
    // ...
  });

  it('returns "domain_expert" for users with only domain expertise', () => {
    // ...
  });

  it('returns "hybrid" for users with both', () => {
    // ...
  });
});
```

## 8. Git & commit conventions

```
feat: add project stage badge
fix: correct spacing on skill tag collapse
docs: update DESIGN_SYSTEM.md — tag collapse rule
refactor: extract GitHub metadata fetch into shared util
chore: seed skills taxonomy
```

- One feature per branch: `feat/profile-edit`, `feat/challenge-spotlight`
- Commit after every successful Claude Code prompt that passes human review — don't batch multiple prompts into one commit
- If a prompt produces bad output, `git reset --hard` or discard rather than trying to manually patch AI-generated code that took a wrong turn

## 9. Security headers

Set once in `next.config.ts` via `async headers()` for `source: '/(.*)'`, so every
response carries them. Current set:

| Header | Value | Why |
| --- | --- | --- |
| `X-Frame-Options` | `DENY` | No framing — anti-clickjacking |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak full paths cross-origin |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Deny device APIs we don't use |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:` | Same-origin only |

The app is fully same-origin (next/font self-hosts Vazirmatn, avatars are
same-origin/data URIs, no CDN), so `default-src 'self'` holds. `'unsafe-inline'`/
`'unsafe-eval'` are required by Next's runtime + dev HMR and Tailwind's inline
style vars — don't tighten these without confirming the app still hydrates. Any
new external origin (script, image, font, API) must be added to the matching CSP
directive here first.

## 10. When extending this document

Same rule as DESIGN_SYSTEM.md: if a convention isn't written here, it isn't a real convention yet — add it here before relying on it across multiple prompts.
