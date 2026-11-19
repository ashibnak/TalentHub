'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { ideaMembers, ideas, projects } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import {
  charterIsComplete,
  clinicIsReady,
  isHttpUrl,
  nextOrbitStage,
  managerPitchIsReady,
  orbitAdvanceError,
  readCharter,
  readDemoScores,
  readScores,
  statusAfterAdvance,
  type OrbitStage,
} from '@/lib/ideas/orbit';

const NOTE_MIN = 10;
const NOTE_MAX = 1000;

async function linkedTeamProject(idea: { id: string; orgId: string; userId: string; demoProjectId: string | null }): Promise<boolean> {
  if (!idea.demoProjectId) return false;
  const [project] = await getDb()
    .select({ userId: projects.userId, status: projects.status })
    .from(projects)
    .where(and(eq(projects.id, idea.demoProjectId), eq(projects.orgId, idea.orgId)))
    .limit(1);
  if (!project || project.status !== 'published') return false;
  if (project.userId === idea.userId) return true;
  const [member] = await getDb()
    .select({ userId: ideaMembers.userId })
    .from(ideaMembers)
    .where(and(eq(ideaMembers.ideaId, idea.id), eq(ideaMembers.userId, project.userId)))
    .limit(1);
  return !!member;
}

function fail(ideaId: string, code: string): never {
  redirect(`/ideas/${ideaId}?orbitError=${code}`);
}

/**
 * Admin review of an idea already inside Orbit. A decision (send back, reject,
 * approve) keeps the stage. "advance" moves exactly one stage and stores the
 * evidence that gate requires.
 */
export async function reviewOrbitAction(formData: FormData) {
  const admin = await requireAdmin();
  const ideaId = String(formData.get('ideaId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (!ideaId) redirect('/admin/ideas');
  if (note.length < NOTE_MIN || note.length > NOTE_MAX) fail(ideaId, 'note');

  const [idea] = await getDb()
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, admin.orgId)))
    .limit(1);
  if (!idea) fail(ideaId, 'not_found');

  try {
    if (decision === 'needs_work' || decision === 'reject' || decision === 'approve') {
      const status = decision === 'needs_work' ? 'needs_work' : decision === 'reject' ? 'rejected' : 'approved';
      await getDb()
        .update(ideas)
        .set({
          status,
          reviewNote: note,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, admin.orgId)));
    } else if (decision === 'advance') {
      const to = String(formData.get('to') ?? '') as OrbitStage;
      const expected = idea.orbitStage ? nextOrbitStage(idea.orbitStage) : null;
      if (!expected || to !== expected) fail(ideaId, 'not_next');

      const scores = readScores(formData);
      const pitchRaw = String(formData.get('pitchUrl') ?? '').trim();
      const pitchUrl = pitchRaw && isHttpUrl(pitchRaw) ? pitchRaw : pitchRaw ? null : idea.pitchUrl;
      if (idea.orbitStage === 'pitch' && pitchRaw && !isHttpUrl(pitchRaw)) fail(ideaId, 'pitch_required');

      const clinicNote = String(formData.get('clinicNote') ?? '').trim() || idea.clinicNote;
      const clinicRaw = String(formData.get('clinicAt') ?? '').trim();
      const clinicAt = clinicRaw ? new Date(clinicRaw) : idea.clinicAt;
      const clinicReady = clinicIsReady(clinicAt, clinicNote);

      const read = readCharter(formData);
      const charter = charterIsComplete(read) ? read : null;
      const demoScores = readDemoScores(formData);
      const error = orbitAdvanceError({
        from: idea.orbitStage,
        to,
        scores,
        clinicReady,
        pitchUrl: pitchUrl ?? null,
        demoLinked: await linkedTeamProject(idea),
        demoScores,
        charter,
      });
      if (error) fail(ideaId, error);

      await getDb()
        .update(ideas)
        .set({
          orbitStage: to,
          status: statusAfterAdvance(to, idea.status),
          reviewNote: note,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
          ...(idea.orbitStage === 'screening' && scores
            ? {
                scoreProblem: scores.problem,
                scoreAgentFit: scores.agentFit,
                scorePrototype: scores.prototype,
                scoreSecurity: scores.security,
                scoreMeasurable: scores.measurable,
                scoreImplement: scores.implement,
              }
            : {}),
          ...(idea.orbitStage === 'clinic' && clinicReady && clinicAt
            ? { clinicAt, clinicNote }
            : {}),
          ...(idea.orbitStage === 'demo' && demoScores
            ? {
                demoScoreFunction: demoScores.function,
                demoScoreValue: demoScores.value,
                demoScoreSecurity: demoScores.security,
                demoScoreReadiness: demoScores.readiness,
              }
            : {}),
          ...(pitchUrl ? { pitchUrl } : {}),
          ...(charter
            ? {
                pilotGoal: charter.goal,
                pilotScope: charter.scope,
                pilotUsers: charter.users,
                pilotMetrics: charter.metrics,
                pilotRisks: charter.risks,
                pilotDecision: charter.decision,
              }
            : {}),
        })
        .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, admin.orgId)));
    } else {
      fail(ideaId, 'invalid');
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('[orbit.review]', err);
    fail(ideaId, 'internal');
  }

  revalidatePath('/ideas');
  revalidatePath(`/ideas/${ideaId}`);
  revalidatePath('/admin/ideas');
  redirect(`/ideas/${ideaId}?orbit=1`);
}

/** Record who heard the idea after it reached Next. Does not move the stage. */
export async function saveManagerPitchAction(formData: FormData) {
  const admin = await requireAdmin();
  const ideaId = String(formData.get('ideaId') ?? '');
  if (!ideaId) redirect('/admin/ideas');
  const audience = String(formData.get('managerPitchTo') ?? '').trim();
  const at = new Date(String(formData.get('managerPitchAt') ?? ''));
  if (!managerPitchIsReady(at, audience)) fail(ideaId, 'pitch_audience');

  const [idea] = await getDb()
    .select({ id: ideas.id, orbitStage: ideas.orbitStage })
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, admin.orgId)))
    .limit(1);
  if (!idea || idea.orbitStage !== 'next') fail(ideaId, 'not_at_next');

  await getDb()
    .update(ideas)
    .set({ managerPitchAt: at, managerPitchTo: audience, updatedAt: new Date() })
    .where(and(eq(ideas.id, ideaId), eq(ideas.orgId, admin.orgId)));

  revalidatePath(`/ideas/${ideaId}`);
  redirect(`/ideas/${ideaId}?pitch=1`);
}
