import { Sparkles, ExternalLink } from 'lucide-react';
import { LESSON_KIND_LABEL_FA, LESSON_LEVEL_LABEL_FA } from '@/lib/lessons/rules';
import { primaryReason, type ScoredLesson } from '@/lib/recommendations/rules';
import { toFaDigits } from '@/lib/format';

/**
 * Adaptive suggestions, ranked from the member's own signals.
 *
 * Every card states WHY it was suggested. "پیشنهاد شده برای تو" with no reason
 * is indistinguishable from an ad; naming the signal ("چون PyTorch در تحلیل
 * مخزنت تأیید نشد") is what makes it feel like the platform paid attention.
 *
 * Renders nothing when nothing scored — a recommender with no confident match
 * should stay quiet rather than pad the page with generic content.
 */

/** One Persian sentence per reason kind. Topic slugs stay Latin (§7.5). */
function reasonText(scored: ScoredLesson): string | null {
  const r = primaryReason(scored);
  if (!r) return null;
  switch (r.kind) {
    case 'verification_gap':
      return `چون «${r.topic}» در تحلیل مخزن پروژه‌ات تأیید نشد`;
    case 'low_level_skill':
      return `چون «${r.topic}» را در حال یادگیری اعلام کرده‌ای`;
    case 'project_skill':
      return `چون در پروژه‌هایت از «${r.topic}» استفاده کرده‌ای`;
    case 'domain':
      return `چون حوزه‌ی تخصصی تو «${r.topic}» است`;
    case 'claimed_skill':
      return `چون «${r.topic}» را بین مهارت‌هایت داری`;
    case 'level_fit':
      return `متناسب با سطح ${LESSON_LEVEL_LABEL_FA[r.level]} تو`;
    case 'role_fit':
      return 'متناسب با نقش تو';
  }
}

export function RecommendedForYou({ items }: { items: ScoredLesson[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={20} strokeWidth={1.5} className="text-info" />
        <h2 className="text-h3 text-fg">پیشنهاد برای تو</h2>
      </div>
      <p className="mb-4 text-body-sm text-text-tertiary leading-relaxed">
        بر اساس مهارت‌ها، پروژه‌ها و حوزه‌ی تخصصی‌ات انتخاب شده — نه بر اساس محبوبیت.
      </p>

      <div className="flex flex-col gap-3">
        {items.map(({ lesson, reasons }) => {
          const why = reasonText({ lesson, reasons, score: 0 });
          return (
            <article key={lesson.slug} className="rounded-lg border border-border-subtle bg-surface p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-sm bg-info-subtle px-2 py-0.5 text-micro text-fg">
                  {LESSON_KIND_LABEL_FA[lesson.kind]}
                </span>
                <span className="text-micro text-text-muted">{LESSON_LEVEL_LABEL_FA[lesson.level]}</span>
                <span dir="ltr" className="text-micro text-text-muted">
                  · {lesson.provider}
                </span>
                {lesson.durationMinutes && (
                  <span className="text-micro text-text-muted">· {toFaDigits(lesson.durationMinutes)} دقیقه</span>
                )}
              </div>

              <p className="text-body font-medium text-fg mb-1">{lesson.title}</p>
              <p className="text-body-sm text-text-tertiary leading-relaxed mb-2">{lesson.description}</p>
              {why && <p className="text-micro text-info mb-3">{why}</p>}

              {lesson.url && (
                <a
                  href={lesson.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-body-sm text-info transition-colors hover:text-fg"
                >
                  دیدن
                  <ExternalLink size={14} strokeWidth={1.5} />
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
