import Link from 'next/link';
import { FolderKanban, Users, Target } from 'lucide-react';

/**
 * Day-one state: replaces the stats, AI-analysis and similar-people blocks when
 * a member has zero projects AND zero ideas.
 *
 * A dashboard of zeros is the worst possible first impression, and this screen
 * directly affects the plan's ≥85% onboarding-completion target. Three concrete
 * next actions beat three cards reading «۰».
 */
const CARDS = [
  {
    href: '/projects/new',
    icon: FolderKanban,
    title: 'اولین پروژه‌ات را اضافه کن',
    desc: 'حتی یک آزمایش کوچک. با لینک مخزن، مهارت‌هایت هم بررسی می‌شوند.',
  },
  {
    href: '/people',
    icon: Users,
    title: '۵ نفر هم‌مهارتت را ببین',
    desc: 'ببین چه کسانی در سازمان روی چیزهای مشابه کار می‌کنند.',
  },
  {
    href: '/challenges',
    icon: Target,
    title: 'به یک چالش سر بزن',
    desc: 'مسئله‌های واقعی سازمان — یکی را بردار یا ایده‌ای برایش بنویس.',
  },
];

export function OnboardingCards() {
  return (
    <section className="mb-8">
      <h2 className="text-h3 text-fg mb-4">از اینجا شروع کن</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-info-subtle">
              <c.icon size={20} strokeWidth={1.5} className="text-info" />
            </div>
            <p className="text-body font-medium text-fg mb-1">{c.title}</p>
            <p className="text-body-sm text-text-tertiary leading-relaxed">{c.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
