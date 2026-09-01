import { RoleBadge } from '@/components/atoms/RoleBadge';
import { formatFaDate } from '@/lib/format';
import type { RoleBadge as RoleBadgeType } from '@/lib/users/role-badge';
import type { WeekWindow } from '@/lib/leaderboard/scoring';

/**
 * Block 1 — who you are and which week it is.
 *
 * The week is stated because every number below it is weekly, not cumulative;
 * without the dates "۴۵ امتیاز" has no frame. The window comes from
 * weekWindow() in lib/leaderboard/scoring.ts (Saturday→Saturday, Asia/Tehran)
 * so this line can never drift from the leaderboard's own definition.
 */
export function HomeGreeting({
  name,
  roleBadge,
  week,
}: {
  name: string;
  roleBadge: RoleBadgeType;
  week: WeekWindow;
}) {
  // `end` is exclusive — show the last day IN the week, not the next Saturday.
  const lastDay = new Date(week.end.getTime() - 86_400_000);

  return (
    <header className="mb-8">
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-h1">سلام {name}</h1>
        <RoleBadge role={roleBadge} />
      </div>
      <p className="text-body-sm text-text-tertiary">
        هفته‌ی جاری · {formatFaDate(week.start)} تا {formatFaDate(lastDay)}
      </p>
    </header>
  );
}
