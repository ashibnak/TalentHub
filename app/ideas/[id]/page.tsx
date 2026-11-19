import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getDemoCandidates, getIdeaById, getIdeaMembers, getIdeaMentors, getLessonUrls, getOpenedCourseKeys, getRecruitSuggestions, isIdeaMember } from '@/lib/db/queries/ideas';
import { getCurrentUser } from '@/lib/auth/session';
import { submitIdeaAction, deleteIdeaAction } from '@/lib/actions/ideas';
import { canDelete, canEdit, canSubmit, canViewIdea } from '@/lib/ideas/rules';
import { IdeaStatusBadge } from '@/components/atoms/IdeaStatusBadge';
import { IdeaIpTerms } from '@/components/molecules/IdeaIpTerms';
import { OrbitTrack } from '@/components/molecules/OrbitTrack';
import { OrbitReviewForm } from '@/components/molecules/OrbitReviewForm';
import { IdeaTeam } from '@/components/molecules/IdeaTeam';
import { IdeaMentors } from '@/components/molecules/IdeaMentors';
import { ManagerPitch } from '@/components/molecules/ManagerPitch';
import { DemoProjectLink } from '@/components/molecules/DemoProjectLink';
import { OrbitCourses } from '@/components/molecules/OrbitCourses';
import { ORBIT_STAGE_LABEL, ORBIT_STAGES } from '@/lib/ideas/orbit';
import { ORBIT_COURSES } from '@/lib/ideas/courses';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { formatFaDate, toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const idea = await getIdeaById(id);
  return { title: idea ? `${idea.title} — AIGraph` : 'ایده پیدا نشد — AIGraph' };
}

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'این ایده پیدا نشد.',
  not_owner: 'این ایده متعلق به تو نیست.',
  not_draft: 'این ایده قبلاً ثبت شده است.',
  locked: 'درباره‌ی این ایده تصمیم نهایی گرفته شده است.',
  internal: 'مشکلی پیش آمد. دوباره تلاش کن.',
  note: 'یادداشت بررسی باید دست‌کم ده کاراکتر باشد.',
  not_next: 'فقط می‌توان به مرحله‌ی بعدی رفت.',
  scores_required: 'هر شش امتیاز ارزیابی باید بین ۱ و ۵ باشد.',
  pitch_required: 'لینک ارائه باید یک نشانی معتبر باشد.',
  clinic_required: 'برای خروج از کارگاه، زمان و یادداشت کارگاه لازم است.',
  demo_required: 'برای ورود به پایلوت، یک پروژه‌ی منتشرشده‌ی تیم را وصل کن.',
  demo_scores_required: 'داوری روز ارائه باید چهار امتیاز بین ۱ و ۵ داشته باشد.',
  pitch_audience: 'زمان ارائه و نام شنوندگان را وارد کن.',
  not_at_next: 'ارائه به مدیران فقط وقتی ثبت می‌شود که ایده به گام بعد رسیده باشد.',
  mentor: 'نام کاربری و نقش منتور لازم است.',
  charter_required: 'منشور پایلوت را کامل کن.',
  username: 'نام کاربری را وارد کن.',
  self: 'نمی‌توانی خودت را به تیم اضافه کنی.',
  project: 'این پروژه منتشرشده و متعلق به تیم نیست.',
  continue_required: 'ورود به گام بعد فقط با تصمیم «ادامه» ممکن است.',
  not_started: 'این ایده هنوز وارد Orbit نشده است.',
  invalid: 'این تصمیم معتبر نیست.',
};

/** One labelled block of the idea. Section titles are Persian (design system §7.5). */
function Section({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h2 className="text-body-sm text-text-tertiary mb-2">{title}</h2>
      <p className="text-body text-fg/90 leading-relaxed whitespace-pre-line">{body}</p>
    </section>
  );
}

export default async function IdeaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    submitted?: string;
    error?: string;
    orbit?: string;
    orbitError?: string;
    team?: string;
    teamError?: string;
    demo?: string;
    courseError?: string;
    mentor?: string;
    pitch?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const viewer = await getCurrentUser();
  const idea = await getIdeaById(id);
  if (!idea) notFound();

  const member = !!viewer && (await isIdeaMember(idea.id, viewer.id));
  // Approved ideas are public. Earlier stages stay with the author, the team, and admins.
  if (!canViewIdea(idea.status, idea.userId, viewer?.id ?? null, viewer?.isAdmin ?? false) && !member) notFound();

  const guard = { currentUserId: viewer?.id ?? '', idea };
  const isOwner = !!viewer && viewer.id === idea.userId;
  const editable = isOwner && canEdit(guard);
  const submittable = isOwner && canSubmit(guard);
  const deletable = isOwner && canDelete(guard);
  const stageIndex = idea.orbitStage ? ORBIT_STAGES.indexOf(idea.orbitStage) : -1;
  const onTeam = isOwner || member;
  const showTeam = !!idea.orbitStage && (onTeam || !!viewer?.isAdmin);
  const showDemo = stageIndex >= ORBIT_STAGES.indexOf('demo');
  const showCourses = stageIndex >= ORBIT_STAGES.indexOf('lab') && onTeam;
  const [members, suggestions, mentors, candidates, opened, lessonUrls] = await Promise.all([
    showTeam ? getIdeaMembers(idea.id) : Promise.resolve([]),
    showTeam && isOwner && viewer ? getRecruitSuggestions(idea.id, viewer.orgId) : Promise.resolve([]),
    showTeam ? getIdeaMentors(idea.id) : Promise.resolve([]),
    showDemo && viewer ? getDemoCandidates(idea.id, viewer.orgId) : Promise.resolve([]),
    showCourses && viewer ? getOpenedCourseKeys(viewer.id) : Promise.resolve([]),
    showCourses ? getLessonUrls(ORBIT_COURSES.map((course) => course.lessonSlug)) : Promise.resolve(new Map<string, string>()),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/ideas" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
        → همه‌ی ایده‌ها
      </Link>

      <div className="mt-3 mb-3 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-h1 leading-tight">{idea.title}</h1>
        {/* The status badge is meaningful only to the author — a public reader
            of an approved idea doesn't need to be told it was approved. */}
        {isOwner && <IdeaStatusBadge status={idea.status} />}
      </div>

      <p className="text-body-sm text-text-tertiary mb-6">
        {idea.author.username ? (
          <Link href={`/u/${idea.author.username}`} className="transition-colors hover:text-info">
            {idea.author.name}
          </Link>
        ) : (
          idea.author.name
        )}
        {' · '}
        {formatFaDate(idea.createdAt)}
        {idea.challenge && (
          <>
            {' · '}
            <Link href={`/challenges/${idea.challenge.slug}`} className="transition-colors hover:text-info">
              {idea.challenge.title}
            </Link>
          </>
        )}
      </p>

      {sp.saved && <p className="mb-6 text-body-sm text-success">ایده ذخیره شد.</p>}
      {sp.submitted && (
        <p className="mb-6 text-body-sm text-success">
          ایده ثبت شد و در نوبت بررسی قرار گرفت. تا وقتی تصمیم نهایی گرفته نشده، می‌توانی ویرایشش کنی.
        </p>
      )}
      {sp.orbit && <p className="mb-6 text-body-sm text-success">تصمیم Orbit ثبت شد.</p>}
      {sp.team && <p className="mb-6 text-body-sm text-success">تیم به‌روز شد.</p>}
      {sp.mentor && <p className="mb-6 text-body-sm text-success">منتورها به‌روز شدند.</p>}
      {sp.pitch && <p className="mb-6 text-body-sm text-success">ارائه به مدیران ثبت شد.</p>}
      {sp.demo && <p className="mb-6 text-body-sm text-success">پروژه‌ی دمو ذخیره شد.</p>}
      {sp.courseError && <p className="mb-6 text-body-sm text-state-error">این درس در فهرست موجود نیست.</p>}
      {(sp.error || sp.orbitError || sp.teamError) && (
        <p className="mb-6 text-body-sm text-state-error">
          {ERROR_MESSAGES[sp.orbitError ?? sp.teamError ?? sp.error ?? ''] ?? ERROR_MESSAGES.internal}
        </p>
      )}

      {idea.orbitStage && (
        <div className="mb-6">
          <OrbitTrack stage={idea.orbitStage} />
        </div>
      )}

      <div className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <Section title="مسئله چیست؟" body={idea.problemStatement} />
        <Section title="راه‌حل پیشنهادی" body={idea.proposedSolution} />
        <Section title="چه کسانی استفاده می‌کنند؟" body={idea.targetUsers} />
        <Section title="از کجا بفهمیم موفق شده؟" body={idea.successCriteria} />
        {idea.currentWorkaround && <Section title="الان این کار چطور انجام می‌شود؟" body={idea.currentWorkaround} />}
        {idea.whyAgent && <Section title="چرا به یک عامل هوش مصنوعی نیاز است؟" body={idea.whyAgent} />}
        {idea.dataNeeded && <Section title="چه داده‌ای لازم است؟" body={idea.dataNeeded} />}
        {idea.teamCapability && <Section title="تیم چه توانی دارد؟" body={idea.teamCapability} />}
        {idea.feasibilityNote && <Section title="نکته‌ی اجرایی" body={idea.feasibilityNote} />}
        {idea.clinicNote && <Section title="یادداشت کارگاه" body={idea.clinicNote} />}
        {idea.pitchUrl && <Section title="لینک ارائه" body={idea.pitchUrl} />}
        {idea.pilot.goal && <Section title="هدف پایلوت" body={idea.pilot.goal} />}
        {idea.pilot.scope && <Section title="محدوده‌ی پایلوت" body={idea.pilot.scope} />}
        {idea.pilot.metrics && <Section title="شاخص‌های پایلوت" body={idea.pilot.metrics} />}
        {idea.pilot.decision && (
          <Section title="تصمیم پایلوت" body={idea.pilot.decision === 'continue' ? 'ادامه' : 'توقف'} />
        )}
      </div>

      {idea.scores.problem != null && (
        <div className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-body-sm text-text-tertiary mb-3">امتیاز ارزیابی</h2>
          <ul className="grid grid-cols-2 gap-2 text-body-sm text-fg">
            <li>اهمیت مسئله: {toFaDigits(idea.scores.problem ?? 0)}</li>
            <li>تناسب عامل: {toFaDigits(idea.scores.agentFit ?? 0)}</li>
            <li>امکان نمونه: {toFaDigits(idea.scores.prototype ?? 0)}</li>
            <li>امنیت داده: {toFaDigits(idea.scores.security ?? 0)}</li>
            <li>قابل سنجش: {toFaDigits(idea.scores.measurable ?? 0)}</li>
            <li>پیاده‌سازی: {toFaDigits(idea.scores.implement ?? 0)}</li>
          </ul>
        </div>
      )}

      {idea.demoScores.function != null && (
        <div className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-body-sm text-text-tertiary mb-3">داوری روز ارائه</h2>
          <ul className="grid grid-cols-2 gap-2 text-body-sm text-fg">
            <li>کارکرد: {toFaDigits(idea.demoScores.function ?? 0)}</li>
            <li>ارزش کسب‌وکار: {toFaDigits(idea.demoScores.value ?? 0)}</li>
            <li>امنیت: {toFaDigits(idea.demoScores.security ?? 0)}</li>
            <li>آمادگی پایلوت: {toFaDigits(idea.demoScores.readiness ?? 0)}</li>
          </ul>
        </div>
      )}

      {/* Ownership position declared at intake — plain Persian, shared wording. */}
      <div className="mt-6">
        <IdeaIpTerms ipTerms={idea.ipTerms} />
      </div>

      {(isOwner || viewer?.isAdmin) && idea.reviewNote && (
        <div className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
          <h2 className="text-body-sm text-text-tertiary mb-2">یادداشت بررسی</h2>
          <p className="text-body text-fg/90 leading-relaxed whitespace-pre-line">{idea.reviewNote}</p>
        </div>
      )}

      {/* Owner controls. Editing stays open until a final decision; submitting
          and deleting are draft-only. */}
      {isOwner && (editable || submittable || deletable) && (
        <div className="mt-8 flex flex-wrap items-center gap-3">
          {submittable && (
            <form action={submitIdeaAction}>
              <input type="hidden" name="ideaId" value={idea.id} />
              <button type="submit" className={btnPrimary}>
                ثبت نهایی برای بررسی
              </button>
            </form>
          )}
          {editable && (
            <Link href={`/ideas/${idea.id}/edit`} className={`inline-flex items-center gap-2 ${btnSecondary}`}>
              <Pencil size={16} strokeWidth={1.5} />
              ویرایش
            </Link>
          )}
          {deletable && (
            <form action={deleteIdeaAction}>
              <input type="hidden" name="ideaId" value={idea.id} />
              <button type="submit" className="text-body-sm text-text-muted transition-colors hover:text-state-error">
                حذف پیش‌نویس
              </button>
            </form>
          )}
          {submittable && (
            <p className="text-body-sm text-text-muted">پس از ثبت نهایی، در نوبت بررسی قرار می‌گیرد.</p>
          )}
        </div>
      )}

      {showTeam && (
        <IdeaTeam
          ideaId={idea.id}
          author={idea.author}
          members={members}
          suggestions={suggestions}
          canManage={isOwner}
        />
      )}
      {showTeam && (
        <IdeaMentors ideaId={idea.id} mentors={mentors} canManage={isOwner || !!viewer?.isAdmin} />
      )}
      {idea.orbitStage === 'next' && (viewer?.isAdmin || idea.managerPitchAt) && (
        <ManagerPitch
          ideaId={idea.id}
          at={idea.managerPitchAt}
          audience={idea.managerPitchTo}
          canEdit={!!viewer?.isAdmin}
        />
      )}
      {showDemo && (
        <DemoProjectLink ideaId={idea.id} current={idea.demoProject} candidates={candidates} canEdit={onTeam} />
      )}
      {showCourses && (
        <OrbitCourses ideaId={idea.id} opened={opened} available={new Set(lessonUrls.keys())} />
      )}

      {viewer?.isAdmin && idea.orbitStage && idea.orbitStage !== 'next' && idea.status !== 'rejected' && (
        <OrbitReviewForm ideaId={idea.id} stage={idea.orbitStage} />
      )}
      {viewer?.isAdmin && idea.orbitStage === 'next' && (
        <p className="mt-6 text-body-sm text-text-tertiary">این ایده به {ORBIT_STAGE_LABEL.next} رسیده است.</p>
      )}
    </main>
  );
}
