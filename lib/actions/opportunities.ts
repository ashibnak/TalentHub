'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { opportunities, applications, orgs, projects } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';

const APP_STATUSES = ['applied', 'shortlisted', 'next_call', 'accepted', 'rejected'] as const;
type AppStatus = (typeof APP_STATUSES)[number];

/** Sponsor (or admin) posts an opportunity. */
export async function createOpportunityAction(formData: FormData) {
  const user = await requireUser();
  if (user.accountType !== 'sponsor' && !user.isAdmin) redirect('/home?error=not_sponsor');

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (title.length < 3 || description.length < 10) redirect('/home?error=opp_invalid');

  const db = getDb();
  const [org] = await db.select().from(orgs).where(eq(orgs.slug, 'main-org')).limit(1);
  if (!org) redirect('/home?error=org');
  const [row] = await db
    .insert(opportunities)
    .values({ orgId: org.id, sponsorId: user.id, title, description })
    .returning({ id: opportunities.id });

  revalidatePath('/opportunities');
  redirect(`/opportunities/${row.id}`);
}

/** Talent applies to an opportunity (once). */
export async function applyAction(formData: FormData) {
  const user = await requireUser();
  const opportunityId = String(formData.get('opportunityId') ?? '');
  if (!opportunityId) redirect('/opportunities');
  const coverNote = String(formData.get('coverNote') ?? '').trim() || null;
  let projectId = String(formData.get('projectId') ?? '').trim() || null;

  const db = getDb();
  const [opp] = await db
    .select({ id: opportunities.id, sponsorId: opportunities.sponsorId, status: opportunities.status })
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!opp) redirect('/opportunities');
  if (opp.status !== 'open') redirect(`/opportunities/${opportunityId}?error=closed`);
  if (opp.sponsorId === user.id) redirect(`/opportunities/${opportunityId}?error=own`);

  // Only allow attaching a project the applicant actually owns and has published.
  if (projectId) {
    const [owned] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id), eq(projects.status, 'published')))
      .limit(1);
    if (!owned) projectId = null;
  }

  // The unique(opportunity_id, applicant_id) constraint is the source of truth —
  // onConflictDoNothing makes a double-apply idempotent instead of a 500.
  await db
    .insert(applications)
    .values({ opportunityId, applicantId: user.id, coverNote, projectId })
    .onConflictDoNothing({ target: [applications.opportunityId, applications.applicantId] });
  revalidatePath(`/opportunities/${opportunityId}`);
  redirect(`/opportunities/${opportunityId}?applied=1`);
}

/** Sponsor (owner) or admin moves an application through the funnel. */
export async function updateApplicationStatusAction(formData: FormData) {
  const user = await requireUser();
  const applicationId = String(formData.get('applicationId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!applicationId || !APP_STATUSES.includes(status as AppStatus)) redirect('/home');

  const db = getDb();
  const [row] = await db
    .select({ oppId: opportunities.id, sponsorId: opportunities.sponsorId })
    .from(applications)
    .innerJoin(opportunities, eq(applications.opportunityId, opportunities.id))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) redirect('/home');
  if (row.sponsorId !== user.id && !user.isAdmin) redirect('/home?error=forbidden');

  await db.update(applications).set({ status: status as AppStatus, updatedAt: new Date() }).where(eq(applications.id, applicationId));
  revalidatePath(`/opportunities/${row.oppId}`);
}

/** Sponsor (owner) or admin closes / reopens an opportunity. */
export async function setOpportunityStatusAction(formData: FormData) {
  const user = await requireUser();
  const opportunityId = String(formData.get('opportunityId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!opportunityId || (status !== 'open' && status !== 'closed')) redirect('/home');

  const db = getDb();
  const [opp] = await db
    .select({ id: opportunities.id, sponsorId: opportunities.sponsorId })
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!opp) redirect('/home');
  if (opp.sponsorId !== user.id && !user.isAdmin) redirect(`/opportunities/${opportunityId}?error=forbidden`);

  await db.update(opportunities).set({ status: status as 'open' | 'closed' }).where(eq(opportunities.id, opportunityId));
  revalidatePath('/opportunities');
  revalidatePath(`/opportunities/${opportunityId}`);
  redirect(`/opportunities/${opportunityId}`);
}
