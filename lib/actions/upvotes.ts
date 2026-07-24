'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { projects, projectUpvotes, users } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { UpvoteInputSchema, checkUpvoteAllowed } from '@/lib/upvotes/rules';

/**
 * Toggle the current user's upvote on a project. Inserts/deletes the
 * project_upvotes row AND rewrites the denormalized projects.upvote_count in one
 * transaction — the count is recomputed from the actual row count (never
 * incremented), so the two can't drift and a double-submit can't corrupt it.
 * Self-upvotes and unpublished projects are rejected server-side.
 */
export async function toggleUpvoteAction(projectId: string) {
  const user = await requireUser();
  const parsed = UpvoteInputSchema.safeParse({ projectId });
  if (!parsed.success) return;
  const id = parsed.data.projectId;

  try {
    const db = getDb();
    const [proj] = await db
      .select({ ownerId: projects.userId, status: projects.status, ownerUsername: users.username })
      .from(projects)
      .innerJoin(users, eq(projects.userId, users.id))
      .where(eq(projects.id, id))
      .limit(1);
    if (!proj) return;

    const rejection = checkUpvoteAllowed({ actorId: user.id, ownerId: proj.ownerId, status: proj.status });
    if (rejection) {
      console.warn(`[upvotes.toggle] rejected (${rejection}) — user ${user.id}, project ${id}`);
      return;
    }

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ userId: projectUpvotes.userId })
        .from(projectUpvotes)
        .where(and(eq(projectUpvotes.userId, user.id), eq(projectUpvotes.projectId, id)))
        .limit(1);

      if (existing) {
        await tx.delete(projectUpvotes).where(and(eq(projectUpvotes.userId, user.id), eq(projectUpvotes.projectId, id)));
      } else {
        await tx.insert(projectUpvotes).values({ userId: user.id, projectId: id }).onConflictDoNothing();
      }

      // Derive the count from the real rows — not an increment — so it stays correct.
      const [{ c }] = await tx
        .select({ c: sql<number>`cast(count(*) as int)` })
        .from(projectUpvotes)
        .where(eq(projectUpvotes.projectId, id));
      await tx.update(projects).set({ upvoteCount: Number(c) }).where(eq(projects.id, id));
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    if (proj.ownerUsername) revalidatePath(`/u/${proj.ownerUsername}`);
    revalidatePath('/home');
    revalidatePath('/leaderboard');
  } catch (err) {
    console.error('[upvotes.toggle]', err);
  }
}
