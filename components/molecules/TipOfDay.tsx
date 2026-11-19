'use client';

import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import type { Tip, TipCategory } from '@/lib/tips/rules';

// Category labels — Persian, because these describe content to the reader
// rather than naming a platform feature (design system §7.5).
const CATEGORY_LABEL: Record<TipCategory, string> = {
  prompt_engineering: 'مهندسی پرامپت',
  ai_tools: 'ترفند ابزار',
  ai_in_domain: 'AI در کار تخصصی',
  platform: 'راهنمای پلتفرم',
};

/**
 * Block 6 — one tip a day, with the day's second behind a control.
 *
 * ⚠️ Deliberately NO points, streak, or badge for reading. The moment a tip
 * earns points, people click through without reading and the block is dead —
 * so the only reward here is the tip itself. Do not add a counter.
 *
 * Client component solely for the "next tip" toggle; the selection itself is
 * computed on the server (deterministic, see lib/tips/rules.ts).
 */
export function TipOfDay({ tips }: { tips: Tip[] }) {
  const [index, setIndex] = useState(0);
  if (tips.length === 0) return null;

  const tip = tips[index];
  const hasMore = tips.length > 1;

  return (
    <section className="mb-8">
      <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Lightbulb size={20} strokeWidth={1.5} className="text-highlight" />
          <h2 className="text-h3 text-fg">نکته‌ی امروز</h2>
          <span className="rounded-sm bg-info-subtle px-2 py-0.5 text-micro text-fg">
            {CATEGORY_LABEL[tip.category]}
          </span>
        </div>

        <p className="text-body font-medium text-fg mb-2">{tip.title}</p>
        <p className="text-body-sm text-text-tertiary leading-relaxed">{tip.body}</p>

        {hasMore && (
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % tips.length)}
            className="mt-4 text-body-sm text-info transition-colors hover:text-fg"
          >
            نکته‌ی بعدی
          </button>
        )}
      </div>
    </section>
  );
}
