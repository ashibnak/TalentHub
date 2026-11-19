import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getCurrentSpotlight } from '@/lib/db/queries/spotlight';
import { getLeaderboard } from '@/lib/db/queries/leaderboard';
import { getLessonPool } from '@/lib/db/queries/lessons';
import { getUserSignals } from '@/lib/db/queries/recommendations';
import {
  getActivityFeed,
  getContributionCounts,
  getDomainValidationQueue,
  getLatestVerificationInsight,
  getMyRoleBadge,
  getSimilarPeople,
} from '@/lib/db/queries/home';
import { getMainOrgId } from '@/lib/db/queries/org';
import { weekWindow, type LeaderboardGroup } from '@/lib/leaderboard/scoring';
import { isDayOne, type RankStanding } from '@/lib/home/rules';
import { pickLessonsForDay } from '@/lib/lessons/rules';
import { recommend } from '@/lib/recommendations/rules';
import { getChangelogEntries } from '@/lib/changelog';
import { HomeGreeting } from '@/components/molecules/HomeGreeting';
import { SpotlightBanner } from '@/components/molecules/SpotlightBanner';
import { DomainValidationList } from '@/components/molecules/DomainValidationCard';
import { WeeklyStats } from '@/components/molecules/WeeklyStats';
import { VerificationInsightCard } from '@/components/molecules/VerificationInsightCard';
import { LessonOfDay } from '@/components/molecules/LessonOfDay';
import { RecommendedForYou } from '@/components/molecules/RecommendedForYou';
import { ActivityFeed } from '@/components/molecules/ActivityFeed';
import { SimilarPeople } from '@/components/molecules/SimilarPeople';
import { ProductNews } from '@/components/molecules/ProductNews';
import { OnboardingCards } from '@/components/molecules/OnboardingCards';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'خانه — AIGraph' };

/**
 * The signed-in home dashboard.
 *
 * ORDERING PRINCIPLE: blocks are ordered by TIME PRESSURE, not importance.
 * Things with a deadline sit at the top (this week's Spotlight, ideas waiting
 * on your judgement, this week's standing); evergreen content sits at the
 * bottom (tips, activity, people, release notes). Reordering by "importance"
 * would bury the only things that expire.
 *
 * Every block degrades to rendering NOTHING rather than throwing — `settle()`
 * below turns a rejected query into a fallback so one slow or broken block can
 * never take down the page. All of them are fetched in parallel.
 *
 * No charts here: the page answers "what should I do now", not "how am I
 * trending". Trends belong on the admin dashboard.
 *
 * Palette note: built against the tokens actually in globals.css
 * (obsidian/teal/amber), NOT the navy/red palette DESIGN_SYSTEM.md still
 * documents — see the response accompanying this change.
 */

/** Resolve a query to a fallback instead of throwing, logging why. */
async function settle<T>(label: string, work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch (err) {
    console.error(`[home.${label}]`, err);
    return fallback;
  }
}

export default async function HomePage() {
  const user = await requireUser();
  if (user.isAdmin) redirect('/admin');

  const week = weekWindow(0);
  const orgId = (await settle('org', getMainOrgId(), null)) ?? user.orgId;

  const [roleBadge, counts, spotlight, thisWeek, lastWeek, validationQueue, insight, lessonPool, activity, similar] =
    await Promise.all([
      settle('roleBadge', getMyRoleBadge(user.id), 'builder' as const),
      settle('counts', getContributionCounts(user.id), { projectCount: 0, ideaCount: 0 }),
      settle('spotlight', getCurrentSpotlight(), null),
      settle('leaderboard', getLeaderboard(0), null),
      settle('leaderboard.last', getLeaderboard(-1), null),
      settle('validationQueue', getDomainValidationQueue(user.id, orgId, 2), []),
      settle('verification', getLatestVerificationInsight(user.id), null),
      settle('lessons', getLessonPool(), []),
      settle('activity', getActivityFeed(orgId, 5), []),
      settle('similar', getSimilarPeople(user.id, orgId, 3), []),
    ]);

  /* ── Weekly standing: the member's own row within their group ── */
  const groupEntries = thisWeek?.groups[roleBadge as LeaderboardGroup] ?? [];
  const mine = groupEntries.find((e) => e.userId === user.id) ?? null;
  const ahead = mine ? (groupEntries.find((e) => e.rank === mine.rank - 1) ?? null) : null;
  const standing: RankStanding | null = mine
    ? { rank: mine.rank, score: mine.score, scoreAhead: ahead?.score ?? null }
    : null;
  const lastWeekScore =
    lastWeek?.groups[roleBadge as LeaderboardGroup]?.find((e) => e.userId === user.id)?.score ?? 0;

  const dayOne = isDayOne(counts);
  const lessons = pickLessonsForDay(lessonPool, roleBadge);

  /* Adaptive suggestions. Signals are fetched only after roleBadge is known, so
     this is the one query outside the parallel batch above. Excludes whatever
     the shared "lesson of the day" is already showing, so the two never repeat. */
  const signals = await settle('signals', getUserSignals(user.id, roleBadge), null);
  const recommended = signals ? recommend(lessonPool, signals, { exclude: lessons.map((l) => l.slug) }) : [];
  const news = getChangelogEntries(2);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* 1 · greeting */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <HomeGreeting name={user.name} roleBadge={roleBadge} week={week} />
        <Link
          href="/projects/new"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
        >
          <Plus size={16} strokeWidth={1.5} />
          پروژه‌ی جدید
        </Link>
      </div>

      {/* 2 · the week's single Spotlight — renders nothing when none is live */}
      <SpotlightBanner spotlight={spotlight} />

      {/* 3 · ideas waiting on this member's domain expertise */}
      <DomainValidationList requests={validationQueue} />

      {/* 4, 5, 8 · replaced wholesale on day one — a wall of zeros is the worst
          possible first impression, and this screen drives onboarding completion */}
      {dayOne ? (
        <OnboardingCards />
      ) : (
        <>
          <WeeklyStats
            data={{
              score: mine?.score ?? 0,
              lastWeekScore,
              upvotesReceived: mine?.breakdown.upvoteReceived ?? 0,
              standing,
              groupSize: groupEntries.length,
            }}
          />
          {insight && <VerificationInsightCard insight={insight} />}
        </>
      )}

      {/* 6a · adaptive: ranked from this member's own skills, projects and
          verification gaps. Silent when nothing matches confidently. */}
      <RecommendedForYou items={recommended} />

      {/* 6b · lesson of the day — SHARED and deterministic, so it stays a
          talking point. Deliberately not personalised; see the response note. */}
      <LessonOfDay lessons={lessons} />

      {/* 7 · what people did */}
      <ActivityFeed events={activity} />

      {/* 8 · the graph, made visible */}
      {!dayOne && <SimilarPeople people={similar} />}

      {/* 9 · evergreen, so it sits last */}
      <ProductNews entries={news} />
    </main>
  );
}
