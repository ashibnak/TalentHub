import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar';
import { RoleBadge } from '@/components/atoms/RoleBadge';
import { RankMedal } from '@/components/atoms/RankMedal';
import { toFaDigits } from '@/lib/format';
import type { LeaderboardEntry } from '@/lib/db/queries/leaderboard';

// One row on the weekly board: rank, avatar, name → profile, role, weekly score.
// Rank-1 is lifted slightly so "who topped the week" reads at a glance.
export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const isTop = entry.rank === 1;
  return (
    <Link
      href={`/u/${entry.username}`}
      className={`flex items-center gap-3 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        isTop ? 'border-info-muted bg-surface' : 'border-border-subtle bg-surface'
      }`}
    >
      <RankMedal rank={entry.rank} />
      <Avatar name={entry.name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-body font-semibold text-fg">{entry.name}</span>
          <RoleBadge role={entry.group} />
        </div>
        {entry.roleTitle && <p className="truncate text-body-sm text-text-tertiary">{entry.roleTitle}</p>}
      </div>
      <div className="shrink-0 text-end">
        <div className="text-body font-semibold text-fg tabular-nums">{toFaDigits(entry.score)}</div>
        <div className="text-micro text-text-muted">امتیاز</div>
      </div>
    </Link>
  );
}
