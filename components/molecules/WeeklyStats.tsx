import { nextRankMilestone, type RankStanding } from '@/lib/home/rules';
import { StatCard } from '@/components/atoms/StatCard';
import { toFaDigits } from '@/lib/format';

export type WeeklyStatsData = {
  score: number;
  lastWeekScore: number;
  upvotesReceived: number;
  standing: RankStanding | null;
  /** Size of the member's role_badge group this week — the rank denominator. */
  groupSize: number;
};

/**
 * Block 4 — this week's contribution, rank within the member's role_badge
 * group, and upvotes received. No charts anywhere on this page: it answers
 * "what should I do now", not "how am I trending".
 */
export function WeeklyStats({ data }: { data: WeeklyStatsData }) {
  const milestone = data.standing ? nextRankMilestone(data.standing) : null;
  const delta = data.score - data.lastWeekScore;

  return (
    <section className="mb-8">
      <h2 className="text-h3 text-fg mb-4">این هفته</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="امتیاز مشارکت" value={data.score} delta={delta} hint="نسبت به هفته‌ی گذشته" />
        {data.standing ? (
          <StatCard label="رتبه در گروه تو" value={data.standing.rank} denominator={data.groupSize} />
        ) : (
          <StatCard label="رتبه در گروه تو" value="—" hint="با اولین مشارکت این هفته وارد رتبه‌بندی می‌شوی" />
        )}
        <StatCard label="رأی دریافتی" value={data.upvotesReceived} />
      </div>

      {/* Omitted entirely at rank 1 or with no score — see nextRankMilestone. */}
      {milestone && (
        <p className="mt-3 text-body-sm text-text-tertiary">
          با {toFaDigits(milestone.pointsNeeded)} امتیاز دیگر به رتبه‌ی {toFaDigits(milestone.targetRank)} می‌رسی.
        </p>
      )}
    </section>
  );
}
