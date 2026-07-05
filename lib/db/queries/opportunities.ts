import { cache } from 'react';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { opportunities, applications, users, projects } from '@/lib/db/schema';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'next_call' | 'accepted' | 'rejected';

export type OpportunityListItem = {
  id: string;
  title: string;
  description: string;
  sponsorName: string;
  sponsorUsername: string | null;
  applicantCount: number;
};

/** Public list of open opportunities, newest first. */
export const getOpportunities = cache(async (): Promise<OpportunityListItem[]> => {
  const db = getDb();
  const rows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      description: opportunities.description,
      sponsorName: users.name,
      sponsorUsername: users.username,
    })
    .from(opportunities)
    .innerJoin(users, eq(opportunities.sponsorId, users.id))
    .where(eq(opportunities.status, 'open'))
    .orderBy(desc(opportunities.createdAt));
  if (rows.length === 0) return [];

  const counts = await db
    .select({ opportunityId: applications.opportunityId, n: count() })
    .from(applications)
    .where(inArray(applications.opportunityId, rows.map((r) => r.id)))
    .groupBy(applications.opportunityId);
  const byOpp = new Map(counts.map((c) => [c.opportunityId, Number(c.n)]));

  return rows.map((r) => ({ ...r, applicantCount: byOpp.get(r.id) ?? 0 }));
});

export type OpportunityDetail = {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed';
  sponsorId: string;
  sponsorName: string;
  sponsorUsername: string | null;
  sponsorRoleTitle: string | null;
  applicantCount: number;
};

export const getOpportunityById = cache(async (id: string): Promise<OpportunityDetail | null> => {
  const db = getDb();
  const [row] = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      description: opportunities.description,
      status: opportunities.status,
      sponsorId: opportunities.sponsorId,
      sponsorName: users.name,
      sponsorUsername: users.username,
      sponsorRoleTitle: users.roleTitle,
    })
    .from(opportunities)
    .innerJoin(users, eq(opportunities.sponsorId, users.id))
    .where(eq(opportunities.id, id))
    .limit(1);
  if (!row) return null;
  const [{ n }] = await db.select({ n: count() }).from(applications).where(eq(applications.opportunityId, id));
  return { ...row, applicantCount: Number(n) };
});

/** The signed-in user's application to a given opportunity, if any. */
export async function getMyApplication(userId: string, opportunityId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: applications.id, status: applications.status })
    .from(applications)
    .where(and(eq(applications.applicantId, userId), eq(applications.opportunityId, opportunityId)))
    .limit(1);
  return row ?? null;
}

export type MyApplication = {
  id: string;
  status: ApplicationStatus;
  opportunityId: string;
  opportunityTitle: string;
  sponsorName: string;
};

/** A talent's own applications (their tracker). */
export const getMyApplications = cache(async (userId: string): Promise<MyApplication[]> => {
  const db = getDb();
  return db
    .select({
      id: applications.id,
      status: applications.status,
      opportunityId: opportunities.id,
      opportunityTitle: opportunities.title,
      sponsorName: users.name,
    })
    .from(applications)
    .innerJoin(opportunities, eq(applications.opportunityId, opportunities.id))
    .innerJoin(users, eq(opportunities.sponsorId, users.id))
    .where(eq(applications.applicantId, userId))
    .orderBy(desc(applications.createdAt));
});

/** A sponsor's OPEN opportunities (for their public profile). */
export const getOpportunitiesBySponsor = cache(async (sponsorId: string): Promise<{ id: string; title: string; applicantCount: number }[]> => {
  const db = getDb();
  const rows = await db
    .select({ id: opportunities.id, title: opportunities.title })
    .from(opportunities)
    .where(and(eq(opportunities.sponsorId, sponsorId), eq(opportunities.status, 'open')))
    .orderBy(desc(opportunities.createdAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({ opportunityId: applications.opportunityId, n: count() })
    .from(applications)
    .where(inArray(applications.opportunityId, rows.map((r) => r.id)))
    .groupBy(applications.opportunityId);
  const byOpp = new Map(counts.map((c) => [c.opportunityId, Number(c.n)]));
  return rows.map((r) => ({ ...r, applicantCount: byOpp.get(r.id) ?? 0 }));
});

export type MyOpportunity = { id: string; title: string; status: 'open' | 'closed'; applicantCount: number };

/** A sponsor's own posted opportunities with applicant counts. */
export const getMyOpportunities = cache(async (sponsorId: string): Promise<MyOpportunity[]> => {
  const db = getDb();
  const rows = await db
    .select({ id: opportunities.id, title: opportunities.title, status: opportunities.status })
    .from(opportunities)
    .where(eq(opportunities.sponsorId, sponsorId))
    .orderBy(desc(opportunities.createdAt));
  if (rows.length === 0) return [];
  const counts = await db
    .select({ opportunityId: applications.opportunityId, n: count() })
    .from(applications)
    .where(inArray(applications.opportunityId, rows.map((r) => r.id)))
    .groupBy(applications.opportunityId);
  const byOpp = new Map(counts.map((c) => [c.opportunityId, Number(c.n)]));
  return rows.map((r) => ({ ...r, applicantCount: byOpp.get(r.id) ?? 0 }));
});

/** A user's published projects, for the "attach a project" selector when applying. */
export async function getProjectOptions(userId: string): Promise<{ id: string; title: string }[]> {
  return getDb()
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.status, 'published')))
    .orderBy(projects.title);
}

export type Applicant = {
  applicationId: string;
  status: ApplicationStatus;
  coverNote: string | null;
  projectId: string | null;
  projectTitle: string | null;
  name: string;
  username: string | null;
  roleTitle: string | null;
};

/** Applicants for one opportunity (for the owning sponsor to review). */
export const getApplicants = cache(async (opportunityId: string): Promise<Applicant[]> => {
  const db = getDb();
  return db
    .select({
      applicationId: applications.id,
      status: applications.status,
      coverNote: applications.coverNote,
      projectId: applications.projectId,
      projectTitle: projects.title,
      name: users.name,
      username: users.username,
      roleTitle: users.roleTitle,
    })
    .from(applications)
    .innerJoin(users, eq(applications.applicantId, users.id))
    .leftJoin(projects, eq(applications.projectId, projects.id))
    .where(eq(applications.opportunityId, opportunityId))
    .orderBy(desc(applications.createdAt));
});
