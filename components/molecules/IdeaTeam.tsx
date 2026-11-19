import { Avatar } from '@/components/atoms/Avatar';
import { addIdeaMemberAction, removeIdeaMemberAction } from '@/lib/actions/orbit-team';
import type { IdeaMember, RecruitSuggestion } from '@/lib/db/queries/ideas';
import { toFaDigits } from '@/lib/format';
import { btnSecondary, inputClass, labelClass } from '@/lib/ui';

/** The author plus the people they recruited by username. */
export function IdeaTeam({
  ideaId,
  author,
  members,
  suggestions,
  canManage,
}: {
  ideaId: string;
  author: { name: string; username: string | null };
  members: IdeaMember[];
  suggestions: RecruitSuggestion[];
  canManage: boolean;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-body-sm text-text-tertiary mb-3">تیم</h2>
      <ul className="flex flex-col gap-3">
        <li className="flex items-center gap-3">
          <Avatar seed={author.username ?? author.name} size={32} />
          <span className="text-body text-fg">{author.name}</span>
          <span className="text-body-sm text-text-muted">نویسنده‌ی ایده</span>
        </li>
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-3">
            <Avatar seed={member.username ?? member.id} size={32} />
            <span className="text-body text-fg">{member.name}</span>
            {canManage && (
              <form action={removeIdeaMemberAction}>
                <input type="hidden" name="ideaId" value={ideaId} />
                <input type="hidden" name="memberId" value={member.id} />
                <button type="submit" className="text-body-sm text-text-muted hover:text-state-error">
                  حذف
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {canManage && suggestions.length > 0 && (
        <div className="mt-4">
          <h3 className="text-body-sm text-text-tertiary mb-2">همکارهایی با مهارت نزدیک</h3>
          <ul className="flex flex-col gap-2">
            {suggestions.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center gap-3">
                <Avatar seed={person.username} size={32} />
                <span className="text-body text-fg">{person.name}</span>
                <span className="text-body-sm text-text-muted">
                  {toFaDigits(person.skills)} مهارت مشترک · {toFaDigits(person.domains)} حوزه مشترک
                </span>
                <form action={addIdeaMemberAction}>
                  <input type="hidden" name="ideaId" value={ideaId} />
                  <input type="hidden" name="username" value={person.username} />
                  <button type="submit" className={btnSecondary}>
                    دعوت کن
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
      {canManage && (
        <form action={addIdeaMemberAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            نام کاربری هم‌تیمی
            <input name="username" required dir="ltr" autoComplete="off" className={`mt-1 ${inputClass}`} />
          </label>
          <input type="hidden" name="ideaId" value={ideaId} />
          <button type="submit" className={btnSecondary}>
            اضافه کن
          </button>
        </form>
      )}
    </section>
  );
}
