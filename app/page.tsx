import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { getPlatformStats } from '@/lib/db/queries/stats';
import { getPeopleDirectory } from '@/lib/db/queries/users';
import { getChallengesDirectory } from '@/lib/db/queries/challenges';
import { ChallengeCard } from '@/components/molecules/ChallengeCard';
import { Avatar } from '@/components/atoms/Avatar';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

const FEATURES = [
  {
    title: 'تأیید از روی کار، نه ادعا',
    desc: 'مهارت‌ها از روی مخزن GitHub سنجیده می‌شوند. هر تأیید یعنی شواهد، نه یک خط در رزومه.',
  },
  {
    title: 'چالش‌های واقعی سازمان',
    desc: 'از منابع انسانی تا مهندسی. مسئله‌ها همین‌جا هستند و با ابزارهای هوش مصنوعی حل می‌شوند.',
  },
  {
    title: 'گراف زنده',
    desc: 'پروژه‌ی تازه، مهارت تازه، مشارکت تازه. پروفایل با کار واقعی به‌روز می‌شود.',
  },
  {
    title: 'هر دو نوع استعداد',
    desc: 'سازنده و متخصص حوزه، کنار هم. لازم نیست برای دیده شدن برنامه‌نویس باشی.',
  },
];

const STEPS = [
  { title: 'بساز', desc: 'پروژه بساز، مهارت‌هایت را ثبت کن و پروفایل را منتشر کن. ابزار مهم نیست؛ اثر مهم است.' },
  { title: 'تأیید شو', desc: 'مهارت‌ها از روی کد بررسی می‌شوند، شفاف و قابل استناد.' },
  { title: 'دیده شو', desc: 'به چالش وصل شو، در گراف پیدا شو و در رتبه‌بندی مشارکت جا داشته باش.' },
];

export default async function Home() {
  const [stats, people, challenges] = await Promise.all([
    getPlatformStats(),
    getPeopleDirectory(),
    getChallengesDirectory(),
  ]);

  const figures = [
    { index: '01', label: 'عضو', value: stats.members },
    { index: '02', label: 'پروژه', value: stats.projects },
    { index: '03', label: 'چالش', value: stats.challenges },
    { index: '04', label: 'مهارت تأییدشده', value: stats.verifiedSkills },
  ];
  const shown = people.slice(0, 4);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_100%_0%,rgba(76,209,214,0.09),transparent)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-end gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="mb-4 font-latin text-micro text-info">Talent graph</p>
            <h1 className="mb-6 max-w-3xl text-display font-bold text-fg">
              استعداد سازمان،
              <br />
              از روی <span className="text-info">کاری که ساخته شده</span>
            </h1>
            <p className="mb-8 max-w-xl text-body-lg leading-relaxed text-text-tertiary">
              رزومه معیار نیست. همکارها با پروژه‌ی واقعی پروفایل می‌سازند، مهارت‌شان از روی GitHub سنجیده می‌شود، و روی مسئله‌های سازمان کار می‌کنند.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/people"
                className="rounded-full bg-action px-6 py-3 text-body font-medium text-on-action transition-colors hover:bg-action-hover"
              >
                دیدن افراد
              </Link>
              <Link
                href="/challenges"
                className="rounded-full border border-border px-6 py-3 text-body font-medium text-fg transition-colors hover:bg-surface"
              >
                چالش‌ها
              </Link>
            </div>
          </div>

          <aside className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-3">
              <p className="font-latin text-micro text-text-muted">Now in the graph</p>
              <p className="text-micro text-text-muted">{toFaDigits(stats.members)} عضو</p>
            </div>
            {shown.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {shown.map((person) => (
                  <li key={person.username}>
                    <Link href={`/u/${person.username}`} className="flex items-center gap-3 transition-colors hover:text-info">
                      <Avatar seed={person.username} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-body font-medium text-fg">{person.name}</span>
                        {person.roleTitle && (
                          <span className="block truncate text-body-sm text-text-tertiary">{person.roleTitle}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm leading-relaxed text-text-tertiary">
                شبکه تازه است. اولین پروفایل‌ها این‌جا دیده می‌شوند.
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className="border-y border-border-subtle">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border-subtle md:grid-cols-4">
          {figures.map((item) => (
            <div key={item.index} className="bg-canvas px-4 py-8 sm:px-6">
              <dt className="mb-3 font-latin text-micro text-text-muted">{item.index}</dt>
              <dd className="text-h1 font-bold text-fg">{toFaDigits(item.value)}</dd>
              <dd className="mt-1 text-body-sm text-text-tertiary">{item.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="mb-2 font-latin text-micro text-text-muted">01 — Why</p>
            <h2 className="text-h2">چرا این‌جا فرق دارد</h2>
          </div>
        </div>
        <ol className="overflow-hidden rounded-xl border border-border-subtle">
          {FEATURES.map((feature, index) => (
            <li
              key={feature.title}
              className="grid gap-3 border-b border-border-subtle bg-surface p-6 last:border-b-0 md:grid-cols-[4rem_1fr] md:gap-8"
            >
              <span className="font-latin text-micro text-info">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="mb-2 text-h3">{feature.title}</h3>
                <p className="max-w-2xl text-body leading-relaxed text-text-tertiary">{feature.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <p className="mb-2 font-latin text-micro text-text-muted">02 — Path</p>
        <h2 className="mb-8 text-h2">سه قدم</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-xl border border-border-subtle bg-surface p-6">
              <span className="mb-6 block font-latin text-h2 text-info">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="mb-2 text-h3">{step.title}</h3>
              <p className="text-body-sm leading-relaxed text-text-tertiary">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <p className="mb-2 font-latin text-micro text-text-muted">03 — Who</p>
        <h2 className="mb-8 text-h2">برای هر دو طرف کار</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border-subtle border-s-2 border-s-action bg-surface p-8 shadow-sm">
            <p className="mb-3 font-latin text-micro text-info">Builder</p>
            <h3 className="mb-2 text-h2">برای سازنده‌ها</h3>
            <p className="mb-6 text-body text-text-tertiary">پروفایلی که مهارت را با کار واقعی نشان می‌دهد.</p>
            <ul className="mb-8 flex flex-col gap-3">
              {['پروژه و مهارت خودت را ثبت کن', 'تأیید از روی GitHub', 'وصل شدن به چالش سازمان', 'جایگاه در رتبه‌بندی هفتگی'].map((line) => (
                <li key={line} className="flex items-center gap-2 text-body text-fg">
                  <Check size={16} strokeWidth={1.5} className="shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
            <Link href="/projects" className="inline-flex items-center gap-1 text-body font-medium text-info transition-colors hover:text-fg">
              پروژه‌ها
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
          </article>
          <article className="rounded-xl border border-border-subtle bg-surface p-8 shadow-sm">
            <p className="mb-3 font-latin text-micro text-text-muted">Domain expert</p>
            <h3 className="mb-2 text-h2">برای متخصص‌های حوزه</h3>
            <p className="mb-6 text-body text-text-tertiary">کدنویسی لازم نیست. تخصصت در مسئله‌های واقعی دیده می‌شود.</p>
            <ul className="mb-8 flex flex-col gap-3">
              {['حوزه‌ات را ثبت کن', 'در چالش همان حوزه شرکت کن', 'کنار سازنده‌ها دیده شو', 'ایده را بدون رزومه جلو ببر'].map((line) => (
                <li key={line} className="flex items-center gap-2 text-body text-fg">
                  <Check size={16} strokeWidth={1.5} className="shrink-0 text-info" />
                  {line}
                </li>
              ))}
            </ul>
            <Link href="/ideas/new" className="inline-flex items-center gap-1 text-body font-medium text-info transition-colors hover:text-fg">
              ثبت ایده
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
          </article>
        </div>
      </section>

      {challenges.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 font-latin text-micro text-text-muted">04 — Open</p>
              <h2 className="text-h2">چالش‌های فعال</h2>
            </div>
            <Link href="/challenges" className="inline-flex items-center gap-1 text-body-sm text-info transition-colors hover:text-fg">
              همه
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {challenges.slice(0, 4).map((challenge) => (
              <ChallengeCard key={challenge.slug} challenge={challenge} />
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-h2">جایت را در گراف بگیر</h2>
            <p className="max-w-lg text-body text-text-tertiary">
              پروفایل بساز، کارت را نشان بده، و اگر مسئله‌ای داری همان را بنویس.
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-full bg-action px-6 py-3 text-body font-medium text-on-action transition-colors hover:bg-action-hover"
          >
            ورود
          </Link>
        </div>
      </section>
    </main>
  );
}
