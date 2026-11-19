'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { ideas } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/session';
import {
  charterIsComplete,
  isHttpUrl,
  nextOrbitStage,
  orbitAdvanceError,
  readCharter,
  readScores,
  statusAfterAdvance,
  type OrbitStage,
} from '@/lib/ideas/orbit';

const NOTE_MIN = 10;
const NOTE_MAX = 1000;

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

      const read = readCharter(formData);
      const charter = charterIsComplete(read) ? read : null;
      const error = orbitAdvanceError({
        from: idea.orbitStage,
        to,
        scores,
        pitchUrl: pitchUrl ?? null,
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
