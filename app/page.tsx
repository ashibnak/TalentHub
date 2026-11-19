import Link from 'next/link';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { getPlatformStats } from '@/lib/db/queries/stats';
import { getPeopleDirectory } from '@/lib/db/queries/users';
import { getChallengesDirectory } from '@/lib/db/queries/challenges';
import { Avatar } from '@/components/atoms/Avatar';
import { RoleBadge } from '@/components/atoms/RoleBadge';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PATH = [
  { index: '01', title: 'بساز', desc: 'پروژه و مهارت را ثبت کن.' },
  { index: '02', title: 'تأیید شو', desc: 'شواهد از روی GitHub می‌آید.' },
  { index: '03', title: 'دیده شو', desc: 'به چالش و رتبه‌بندی وصل شو.' },
];

export default async function Home() {
  const [stats, people, challenges] = await Promise.all([
    getPlatformStats(),
    getPeopleDirectory(),
    getChallengesDirectory(),
  ]);

  const roster = people.slice(0, 6);
  const featured = challenges[0] ?? null;
  const rest = challenges.slice(1, 4);
  const figures = [
    { label: 'عضو', value: stats.members },
    { label: 'پروژه', value: stats.projects },
    { label: 'چالش', value: stats.challenges },
    { label: 'مهارت تأییدشده', value: stats.verifiedSkills },
  ];

  return (
    <main>
      {/* Hero: brand, one claim, one CTA group, then the product itself. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(48%_42%_at_70%_0%,rgba(76,209,214,0.11),transparent)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6">
          <p className="mb-4 text-h3 font-bold tracking-tight text-fg">
            AIGraph<span className="text-info">.</span>
          </p>
          <h1 className="mb-4 max-w-3xl text-display font-bold text-fg">
            استعداد سازمان،
            <br />
            از روی <span className="text-info">کاری که ساخته شده</span>
          </h1>
          <p className="mb-8 max-w-xl text-body-lg leading-relaxed text-text-tertiary">
            رزومه معیار نیست. همکارها با پروژه‌ی واقعی پروفایل می‌سازند، مهارت‌شان از روی GitHub سنجیده می‌شود، و روی مسئله‌های سازمان کار می‌کنند.
          </p>
          <div className="mb-12 flex flex-wrap items-center gap-3">
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

          {/* Product frame: a quiet directory surface, not a marketing collage. */}
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-info" />
                <span className="text-body-sm text-fg">افراد</span>
              </div>
              <span className="text-body-sm text-text-muted">{toFaDigits(stats.members)} عضو فعال</span>
            </div>
            <ul>
              {roster.length > 0 ? (
                roster.map((person) => (
                  <li key={person.username} className="border-b border-border-subtle last:border-b-0">
                    <Link
                      href={`/u/${person.username}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated sm:px-6"
                    >
                      <Avatar seed={person.username} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-body font-medium text-fg">{person.name}</span>
                          <RoleBadge role={person.roleBadge} />
                        </span>
                        {person.roleTitle && (
                          <span className="mt-1 block truncate text-body-sm text-text-tertiary">{person.roleTitle}</span>
                        )}
                      </span>
                      <span className="hidden items-center gap-2 sm:flex">
                        {person.topSkills.slice(0, 2).map((skill) => (
                          <span
                            key={skill.slug}
                            className="inline-flex items-center gap-1 rounded-sm bg-fg/5 px-2 py-0.5 font-latin text-micro text-text-tertiary"
                          >
                            {skill.verified && <ShieldCheck size={11} strokeWidth={1.5} className="text-success" />}
                            {skill.name}
                          </span>
                        ))}
                      </span>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-6 py-8 text-body-sm text-text-tertiary">شبکه تازه است. اولین پروفایل‌ها این‌جا دیده می‌شوند.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-border-subtle">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border-subtle md:grid-cols-4">
          {figures.map((item) => (
            <div key={item.label} className="bg-canvas px-4 py-6 sm:px-6">
              <dt className="text-body-sm text-text-muted">{item.label}</dt>
              <dd className="mt-2 text-h2 font-bold text-fg">{toFaDigits(item.value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <h2 className="mb-3 text-h2">سه قدم تا دیده شدن</h2>
          <p className="text-body leading-relaxed text-text-tertiary">
            ساختن، تأیید، و اتصال به کار واقعی سازمان. مسیر کوتاه است.
          </p>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle md:grid-cols-3">
          {PATH.map((step) => (
            <li key={step.index} className="bg-surface p-6">
              <span className="mb-6 block font-latin text-micro text-info">{step.index}</span>
              <h3 className="mb-2 text-h3">{step.title}</h3>
              <p className="text-body-sm leading-relaxed text-text-tertiary">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h2 className="mb-8 text-h2">برای هر دو طرف کار</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-border-subtle border-s-2 border-s-action bg-surface p-8">
            <h3 className="mb-2 text-h2">سازنده‌ها</h3>
            <p className="mb-6 text-body text-text-tertiary">مهارت با پروژه‌ی واقعی ثابت می‌شود.</p>
            <ul className="mb-8 flex flex-col gap-3">
              {['ثبت پروژه و مهارت', 'تأیید از روی GitHub', 'اتصال به چالش', 'جایگاه در رتبه‌بندی'].map((line) => (
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
          <article className="rounded-xl border border-border-subtle bg-surface p-8">
            <h3 className="mb-2 text-h2">متخصص‌های حوزه</h3>
            <p className="mb-6 text-body text-text-tertiary">بدون کدنویسی، با مسئله‌ی واقعی دیده می‌شوی.</p>
            <ul className="mb-8 flex flex-col gap-3">
              {['ثبت حوزه', 'ورود به چالش همان حوزه', 'کنار سازنده‌ها', 'ثبت ایده'].map((line) => (
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

      {featured && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <h2 className="text-h2">چالش‌های فعال</h2>
            <Link href="/challenges" className="inline-flex items-center gap-1 text-body-sm text-info transition-colors hover:text-fg">
              همه
              <ArrowLeft size={16} strokeWidth={1.5} />
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Link
              href={`/challenges/${featured.slug}`}
              className="rounded-xl border border-border-subtle bg-surface p-8 transition-colors hover:bg-surface-elevated"
            >
              <p className="mb-3 text-body-sm text-text-muted">چالش اصلی</p>
              <h3 className="mb-3 text-h2 text-fg">{featured.title}</h3>
              <p className="mb-6 max-w-xl text-body leading-relaxed text-text-tertiary">{featured.description}</p>
              <p className="text-body-sm text-text-muted">
                {toFaDigits(featured.problemCount)} مسئله · {toFaDigits(featured.projectCount)} پروژه
                {featured.sponsorTeam ? ` · ${featured.sponsorTeam}` : ''}
              </p>
            </Link>
            <ul className="flex flex-col gap-px overflow-hidden rounded-xl border border-border-subtle bg-border-subtle">
              {rest.map((challenge) => (
                <li key={challenge.slug} className="bg-surface">
                  <Link href={`/challenges/${challenge.slug}`} className="block p-6 transition-colors hover:bg-surface-elevated">
                    <h3 className="mb-1 text-h3 text-fg">{challenge.title}</h3>
                    <p className="line-clamp-2 text-body-sm leading-relaxed text-text-tertiary">{challenge.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="border-t border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-h2">جایت را در گراف بگیر</h2>
            <p className="max-w-lg text-body text-text-tertiary">پروفایل بساز، کارت را نشان بده، و اگر مسئله‌ای داری همان را بنویس.</p>
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
