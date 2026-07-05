import { cache } from 'react';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { notifications } from '@/lib/db/schema';

export type NotificationItem = {
  id: string;
  type: 'application_status' | 'new_applicant' | 'new_opportunity';
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/** Unread count for the nav bell. */
export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  const [row] = await getDb()
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return Number(row?.n ?? 0);
});

/** The user's notifications, newest first. */
export const getNotifications = cache(async (userId: string, limit = 50): Promise<NotificationItem[]> => {
  return getDb()
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      href: notifications.href,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
});
