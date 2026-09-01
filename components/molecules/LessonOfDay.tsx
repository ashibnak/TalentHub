'use client';

import { useState } from 'react';
import { GraduationCap, ExternalLink } from 'lucide-react';
import { LESSON_LEVEL_LABEL_FA, type Lesson } from '@/lib/lessons/rules';
import { toFaDigits } from '@/lib/format';

/**
 * Block 6 — one curated external lesson a day, with the day's second behind a
 * control. Replaces the inline tip: a real course from Anthropic / OpenAI / IBM
 * / Hugging Face teaches more than a one-line aphorism.
 *
 * ⚠️ Still NO points, streak or badge for opening a lesson. The moment learning
 * earns points, people click through without reading and the block is dead.
 *
 * Client component solely for the "next" toggle; selection is computed on the
 * server and is deterministic (lib/lessons/rules.ts).
 */

/** Level chip colour rises with difficulty — the one place level is emphasised. */
const LEVEL_CLASS: Record<Lesson['level'], string> = {
  beginner: 'bg-success-subtle text-success',
  intermediate: 'bg-info-subtle text-info',
  advanced: 'bg-highlight-subtle text-highlight',
};

export function LessonOfDay({ lessons }: { lessons: Lesson[] }) {
  const [index, setIndex] = useState(0);
  if (lessons.length === 0) return null;

  const lesson = lessons[index];
  const hasMore = lessons.length > 1;

  return (
    <section className="mb-8">
      <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <GraduationCap size={20} strokeWidth={1.5} className="text-highlight" />
          <h2 className="text-h3 text-fg">درس امروز</h2>
          <span className={`rounded-sm px-2 py-0.5 text-micro ${LEVEL_CLASS[lesson.level]}`}>
            {LESSON_LEVEL_LABEL_FA[lesson.level]}
          </span>
          {/* Provider names stay Latin — proper nouns (design system §7.5). */}
          <span dir="ltr" className="text-micro text-text-muted">
            {lesson.provider}
          </span>
          {lesson.durationMinutes && (
            <span className="text-micro text-text-muted">
              · حدود {toFaDigits(lesson.durationMinutes)} دقیقه
            </span>
          )}
        </div>

        <p className="text-body font-medium text-fg mb-2">{lesson.title}</p>
        <p className="text-body-sm text-text-tertiary leading-relaxed mb-4">{lesson.description}</p>

        <div className="flex flex-wrap items-center gap-4">
          {/* kind='tip' entries are inline advice with nowhere to go. */}
          {lesson.url && (
            <a
              href={lesson.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-body-sm font-medium text-fg shadow-sm transition-colors hover:bg-surface-elevated"
            >
              دیدن درس
              <ExternalLink size={14} strokeWidth={1.5} />
            </a>
          )}
          {hasMore && (
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % lessons.length)}
              className="text-body-sm text-info transition-colors hover:text-fg"
            >
              درس بعدی
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
