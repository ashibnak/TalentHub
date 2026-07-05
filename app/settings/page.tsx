import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, X, Plus, FolderKanban, Pencil, ExternalLink } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getMyProfile, getMyUserSkills, getMyProjects } from '@/lib/db/queries/me';
import { getAllSkills, type SkillCategory } from '@/lib/db/queries/taxonomy';
import { updateProfileAction, addSkillAction, removeSkillAction } from '@/lib/actions/profile';
import { setProjectStatusAction } from '@/lib/actions/projects';
import { StageBadge } from '@/components/atoms/StageBadge';
import { PublishBadge } from '@/components/atoms/PublishBadge';
import { EmptyState } from '@/components/atoms/EmptyState';
import { inputClass, labelClass, btnPrimary } from '@/lib/ui';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'تنظیمات — AIGraph' };

const SAVED_MESSAGES: Record<string, string> = {
  profile: 'پروفایل ذخیره شد.',
  skill: 'مهارت اضافه شد.',
  skill_removed: 'مهارت حذف شد.',
  project: 'پروژه ذخیره شد.',
  project_deleted: 'پروژه حذف شد.',
};
const ERROR_MESSAGES: Record<string, string> = {
  name: 'نام باید بین ۲ تا ۸۰ کاراکتر باشد.',
  roleTitle: 'عنوان شغلی خیلی طولانی است.',
  bio: 'بایو حداکثر ۶۰۰ کاراکتر است.',
  github: 'نام کاربری گیت‌هاب نامعتبر است.',
  linkedin: 'لینک لینکدین معتبر نیست (باید با http شروع شود).',
  skill: 'مهارت انتخاب‌شده نامعتبر است.',
  level: 'سطح باید بین ۱ تا ۵ باشد.',
  forbidden: 'اجازه‌ی این کار را نداری.',
};
const CATEGORY_ORDER: SkillCategory[] = ['language', 'framework', 'tool', 'concept', 'ai_tool'];
const CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: 'زبان‌ها',
  framework: 'فریم‌ورک‌ها',
  tool: 'ابزارها',
  concept: 'مفاهیم',
  ai_tool: 'ابزارهای هوش مصنوعی',
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requireUser();
  const profile = await getMyProfile(user.id);
  if (!profile) notFound();
  const sp = await searchParams;
  const isTalent = profile.accountType !== 'sponsor';

  const [mySkills, myProjects, allSkills] = isTalent
    ? await Promise.all([getMyUserSkills(user.id), getMyProjects(user.id), getAllSkills()])
    : [[], [], []];
  const claimedSlugs = new Set(mySkills.map((s) => s.slug));
  const availableSkills = allSkills.filter((s) => !claimedSlugs.has(s.slug));
  const skillsByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: availableSkills.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 mb-1">تنظیمات</h1>
          <p className="text-body-sm text-text-tertiary">پروفایل، مهارت‌ها و پروژه‌هایت را مدیریت کن</p>
        </div>
        {profile.username && (
          <Link
            href={`/u/${profile.username}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-4 py-2 text-body font-medium text-fg shadow-sm transition-colors hover:bg-surface-elevated"
          >
            پروفایل عمومی
            <ExternalLink size={16} strokeWidth={1.5} />
          </Link>
        )}
      </div>

      {sp.saved && <p className="mb-4 text-body-sm text-success">{SAVED_MESSAGES[sp.saved] ?? 'ذخیره شد.'}</p>}
      {sp.error && <p className="mb-4 text-body-sm text-red-400">{ERROR_MESSAGES[sp.error] ?? 'خطا رخ داد.'}</p>}

      {/* ── Profile ── */}
      <section className="mb-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <h2 className="text-h3 mb-4">پروفایل</h2>
        <form action={updateProfileAction} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              نام
              <input name="name" required minLength={2} maxLength={80} defaultValue={profile.name} className={`mt-1 w-full ${inputClass}`} />
            </label>
            <label className={labelClass}>
              عنوان شغلی
              <input name="roleTitle" maxLength={120} defaultValue={profile.roleTitle ?? ''} className={`mt-1 w-full ${inputClass}`} placeholder="مثلاً مهندس یادگیری ماشین" />
            </label>
          </div>
          <label className={labelClass}>
            بایو
            <textarea name="bio" rows={4} maxLength={600} defaultValue={profile.bio ?? ''} className={`mt-1 w-full ${inputClass}`} placeholder="یک معرفی کوتاه از خودت و کاری که می‌کنی" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              نام کاربری گیت‌هاب
              <input name="githubUsername" dir="ltr" defaultValue={profile.githubUsername ?? ''} className={`mt-1 w-full ${inputClass}`} placeholder="octocat" />
            </label>
            <label className={labelClass}>
              لینک لینکدین
              <input name="linkedinUrl" type="url" dir="ltr" defaultValue={profile.linkedinUrl ?? ''} className={`mt-1 w-full ${inputClass}`} placeholder="https://linkedin.com/in/…" />
            </label>
          </div>
          <button type="submit" className={`self-start ${btnPrimary}`}>
            ذخیره پروفایل
          </button>
        </form>
      </section>

      {isTalent && (
        <>
          {/* ── Skills ── */}
          <section className="mb-8 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
            <h2 className="text-h3 mb-4">مهارت‌ها</h2>
            {mySkills.length > 0 ? (
              <div className="mb-5 flex flex-wrap gap-2">
                {mySkills.map((s) => (
                  <form key={s.slug} action={removeSkillAction} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface ps-3 pe-1 py-1">
                    <input type="hidden" name="skillSlug" value={s.slug} />
                    {s.verified && <ShieldCheck size={11} strokeWidth={1.5} className="text-success" />}
                    <span className="text-body-sm text-fg">{s.name}</span>
                    <span className="text-micro text-text-tertiary">سطح {toFaDigits(s.claimedLevel)}</span>
                    <button type="submit" aria-label={`حذف ${s.name}`} className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-canvas hover:text-red-400">
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </form>
                ))}
              </div>
            ) : (
              <p className="mb-5 text-body-sm text-text-muted">هنوز مهارتی اضافه نکرده‌ای.</p>
            )}

            {availableSkills.length > 0 && (
              <form action={addSkillAction} className="flex flex-wrap items-end gap-3 border-t border-border-subtle pt-5">
                <label className={`grow ${labelClass}`}>
                  افزودن مهارت
                  <select name="skillSlug" required defaultValue="" className={`mt-1 w-full ${inputClass}`}>
                    <option value="" disabled>
                      یک مهارت انتخاب کن…
                    </option>
                    {skillsByCategory.map((g) => (
                      <optgroup key={g.category} label={CATEGORY_LABELS[g.category]}>
                        {g.items.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {s.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <label className={labelClass}>
                  سطح
                  <select name="claimedLevel" defaultValue="3" aria-label="سطح مهارت" className={`mt-1 ${inputClass}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {toFaDigits(n)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={`inline-flex items-center gap-1 ${btnPrimary}`}>
                  <Plus size={16} strokeWidth={1.5} />
                  افزودن
                </button>
              </form>
            )}
          </section>

          {/* ── Projects ── */}
          <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-h3">پروژه‌ها</h2>
              <Link href="/projects/new" className={`inline-flex items-center gap-1 ${btnPrimary}`}>
                <Plus size={16} strokeWidth={1.5} />
                پروژه‌ی جدید
              </Link>
            </div>
            {myProjects.length > 0 ? (
              <div className="flex flex-col gap-2">
                {myProjects.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface p-4">
                    <span className="min-w-0 grow truncate text-body text-fg">{p.title}</span>
                    <StageBadge stage={p.stage} />
                    <PublishBadge status={p.status} />
                    <div className="flex items-center gap-2">
                      <Link href={`/projects/${p.id}/edit`} className="inline-flex items-center gap-1 text-body-sm text-info transition-colors hover:text-fg">
                        <Pencil size={14} strokeWidth={1.5} />
                        ویرایش
                      </Link>
                      {p.status === 'published' && (
                        <Link href={`/projects/${p.id}`} className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
                          مشاهده
                        </Link>
                      )}
                      <form action={setProjectStatusAction}>
                        <input type="hidden" name="projectId" value={p.id} />
                        <input type="hidden" name="status" value={p.status === 'published' ? 'draft' : 'published'} />
                        <button type="submit" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
                          {p.status === 'published' ? 'پیش‌نویس کن' : 'منتشر کن'}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={FolderKanban} title="هنوز پروژه‌ای نساخته‌ای" hint="اولین پروژه‌ات را اضافه کن تا در گراف دیده شوی" />
            )}
          </section>
        </>
      )}

      {!isTalent && (
        <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-h3 mb-1">فرصت‌ها</h2>
          <p className="mb-4 text-body-sm text-text-tertiary">فرصت‌ها و متقاضی‌ها را از پنل خانه مدیریت کن.</p>
          <Link href="/home" className={btnPrimary}>
            پنل کارفرما
          </Link>
        </section>
      )}
    </main>
  );
}
