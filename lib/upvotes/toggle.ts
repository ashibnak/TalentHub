import { and, eq, sql } from 'drizzle-orm';
import type { getDb } from '@/lib/db';
import { projects, projectUpvotes } from '@/lib/db/schema';

type Db = ReturnType<typeof getDb>;

/**
 * Toggle `actorId`'s upvote on a project and rewrite the denormalized
 * `projects.upvote_count` from the ACTUAL row count (never an increment), all in
 * one transaction — so the count can't drift and a concurrent double-submit
 * can't corrupt it. Returns the new count. Auth / status checks live in the
 * server action; this is the DB core (so the invariant is unit-testable).
 */
export async function applyUpvoteToggle(db: Db, actorId: string, projectId: string): Promise<number> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ userId: projectUpvotes.userId })
      .from(projectUpvotes)
      .where(and(eq(projectUpvotes.userId, actorId), eq(projectUpvotes.projectId, projectId)))
      .limit(1);

    if (existing) {
      await tx.delete(projectUpvotes).where(and(eq(projectUpvotes.userId, actorId), eq(projectUpvotes.projectId, projectId)));
    } else {
      await tx.insert(projectUpvotes).values({ userId: actorId, projectId }).onConflictDoNothing();
    }

    const [{ c }] = await tx
      .select({ c: sql<number>`cast(count(*) as int)` })
      .from(projectUpvotes)
      .where(eq(projectUpvotes.projectId, projectId));
    await tx.update(projects).set({ upvoteCount: Number(c) }).where(eq(projects.id, projectId));
    return Number(c);
  });
}
