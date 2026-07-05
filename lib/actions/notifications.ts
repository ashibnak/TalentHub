'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';

/** Mark all of the signed-in user's notifications as read. */
export async function markAllReadAction() {
  const user = await requireUser();
  await getDb()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath('/notifications');
  redirect('/notifications');
}
