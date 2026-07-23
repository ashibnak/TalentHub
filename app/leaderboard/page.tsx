import type { Metadata } from 'next';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { getLeaderboard } from '@/lib/db/queries/leaderboard';
import { GROUP_ORDER, GROUP_LABEL_FA, POINTS, type LeaderboardGroup } from '@/lib/leaderboard/scoring';
import { LeaderboardRow } from '@/components/molecules/LeaderboardRow';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'برترین‌های هفته — AIGraph' };

type SearchParams = { group?: string; week?: string };

// Jalali date (Tehran), Persian digits — e.g. «۲۶ تیر».
const DATE_FMT = new Intl.DateTimeFormat('fa-IR', { month: 'long', day: 'numeric', timeZone: 'Asia/Tehran' });

function isGroup(v: string | undefined): v is LeaderboardGroup {
  return !!v && (GROUP_ORDER as readonly string[]).includes(v);
}

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const week = sp.week === '-1' ? -1 : 0;
  const group: LeaderboardGroup = isGroup(sp.group) ? sp.group : 'builder';

  const board = await getLeaderboard(week);
  const rangeStart = DATE_FMT.format(board.window.start);
  const rangeEnd = DATE_FMT.format(new Date(board.window.end.getTime() - 86_400_000)); // last day, inclusive
  const entries = board.groups[group];

  const weekHref = (w: number) => `/leaderboard?group=${group}&week=${w}`;
  const groupHref = (g: LeaderboardGroup) => `/leaderboard?group=${g}&week=${week}`;

  const statusNote =
    week === 0
      ? 'در حال جمع‌شدن — تا شنبه ادامه دارد.'
      : board.frozen
        ? 'نتایج نهایی این هفته ثبت شده است.'
        : 'هنوز نهایی نشده — در انتظار ثبت توسط مدیر.';

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-2 flex items-center gap-2">
        <Trophy size={22} strokeWidth={1.5} className="text-info" />
        <h1 className="text-h1">برترین‌های هفته</h1>
      </div>
      <p className="text-body-sm text-text-tertiary">
        بیشترین مشارکت روی پروژه‌ها، هفته‌به‌هفته. {toFaDigits(rangeStart)} تا {toFaDigits(rangeEnd)} — {statusNote}
      </p>
      <p className="mt-2 text-micro text-text-muted">
        انتشار پروژه {toFaDigits(POINTS.publishProject)} · ثبت روی چالش {toFaDigits(POINTS.challengeSubmission)} · هر رأی{' '}
        {toFaDigits(POINTS.upvoteReceived)} · بردن Spotlight {toFaDigits(POINTS.spotlightWin)} امتیاز
      </p>

      {/* ── Week toggle ── */}
      <div className="mt-6 flex gap-2">
        {([0, -1] as const).map((w) => {
          const active = week === w;
          return (
            <Link
              key={w}
              href={weekHref(w)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full px-4 py-1.5 text-body-sm font-medium transition-colors ${
                active ? 'bg-action text-on-action' : 'border border-border bg-surface text-text-tertiary hover:text-fg'
              }`}
            >
              {w === 0 ? 'این هفته' : 'هفته‌ی گذشته'}
            </Link>
          );
        })}
      </div>

      {/* ── Group tabs ── */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-border-subtle pb-4">
        {GROUP_ORDER.map((g) => {
          const active = group === g;
          const count = board.groups[g].length;
          return (
            <Link
              key={g}
              href={groupHref(g)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-body-sm transition-colors ${
                active ? 'bg-info-subtle font-medium text-info' : 'text-text-tertiary hover:text-fg'
              }`}
            >
              {GROUP_LABEL_FA[g]}
              <span className="text-text-muted"> · {toFaDigits(count)}</span>
            </Link>
          );
        })}
      </div>

      {/* ── The board ── */}
      <div className="mt-6">
        {entries.length > 0 ? (
          <div className="flex flex-col gap-2">
            {entries.map((e) => (
              <LeaderboardRow key={e.userId} entry={e} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="این هفته هنوز مشارکتی در این گروه ثبت نشده"
            hint="پروژه‌ات را منتشر کن یا روی یک چالش کار کن تا اینجا دیده شوی"
          />
        )}
      </div>
    </main>
  );
}
