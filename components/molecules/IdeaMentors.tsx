import { Avatar } from '@/components/atoms/Avatar';
import { assignIdeaMentorAction, removeIdeaMentorAction } from '@/lib/actions/orbit-team';
import type { IdeaMentor } from '@/lib/db/queries/ideas';
import { MENTOR_ROLE_LABEL, MENTOR_ROLES } from '@/lib/ideas/mentors';
import { btnSecondary, inputClass, labelClass } from '@/lib/ui';

/** Six Orbit mentor roles, assigned to people already in the organization. */
export function IdeaMentors({
  ideaId,
  mentors,
  canManage,
}: {
  ideaId: string;
  mentors: IdeaMentor[];
  canManage: boolean;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-body-sm text-text-tertiary mb-3">منتورها</h2>
      {mentors.length === 0 ? (
        <p className="text-body-sm text-text-muted">هنوز منتوری به این ایده وصل نشده است.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {mentors.map((mentor) => (
            <li key={`${mentor.id}-${mentor.role}`} className="flex flex-wrap items-center gap-3">
              <Avatar seed={mentor.username ?? mentor.id} size={32} />
              <span className="text-body text-fg">{mentor.name}</span>
              <span className="text-body-sm text-text-muted">{MENTOR_ROLE_LABEL[mentor.role]}</span>
              {canManage && (
                <form action={removeIdeaMentorAction}>
                  <input type="hidden" name="ideaId" value={ideaId} />
                  <input type="hidden" name="mentorId" value={mentor.id} />
                  <input type="hidden" name="role" value={mentor.role} />
                  <button type="submit" className="text-body-sm text-text-muted hover:text-state-error">
                    حذف
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form action={assignIdeaMentorAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            نام کاربری
            <input name="username" required dir="ltr" autoComplete="off" className={`mt-1 ${inputClass}`} />
          </label>
          <label className={labelClass}>
            نقش
            <select name="role" required className={`mt-1 w-full ${inputClass}`} defaultValue="product">
              {MENTOR_ROLES.map((role) => (
                <option key={role} value={role}>
                  {MENTOR_ROLE_LABEL[role]}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="ideaId" value={ideaId} />
          <button type="submit" className={btnSecondary}>
            افزودن منتور
          </button>
        </form>
      )}
    </section>
  );
}
