import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SpotlightBadge } from '@/components/atoms/SpotlightBadge';
import { toFaDigits } from '@/lib/format';
import type { CurrentSpotlight } from '@/lib/db/queries/spotlight';

/**
 * The weekly Spotlight banner (DESIGN_SYSTEM §5.8 — ONE per page, never stacked).
 *
 * ⚠️ Palette discrepancy, flagged rather than silently resolved: §5.8 specifies
 * "navy text on white background" via `bg-spotlight` + `text-surface`, written
 * against the old navy/red palette. globals.css now runs the obsidian/teal/amber
 * tokens, where `--color-spotlight` is a translucent TEAL wash
 * (rgba(76,209,214,0.08)) and `--color-surface` is dark charcoal — so the doc's
 * literal markup would paint near-black text on a nearly-transparent tint over a
 * dark canvas, i.e. invisible. Built here from the tokens that actually exist,
 * keeping §5.8's intent: one loud, high-contrast, unmissable, non-stacking
 * banner. The amber accent is the same one SpotlightBadge already wears.
 *
 * Spacing note: §5.8's snippet uses p-5 / mb-1.5, neither of which is on the
 * §4.1 allowlist (p-5 is explicitly forbidden). Rounded to p-6 / mb-2.
 *
 * Renders nothing when no spotlight is running — no empty placeholder, because
 * a permanent "no spotlight this week" box teaches people to ignore the slot.
 */
export function SpotlightBanner({ spotlight }: { spotlight: CurrentSpotlight | null }) {
  if (!spotlight) return null;

  const { daysRemaining, submissionCount } = spotlight;
  const remaining =
    daysRemaining === 0 ? 'امروز آخرین روز' : `${toFaDigits(daysRemaining)} روز باقی مانده`;

  return (
    <section className="mb-8 rounded-xl border border-info-muted bg-spotlight p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SpotlightBadge />
        <span className="text-body-sm text-highlight">{remaining}</span>
      </div>

      <h2 className="text-h2 text-fg mb-2 leading-snug">{spotlight.title}</h2>

      <p className="text-body-sm text-text-tertiary mb-4 leading-relaxed">
        {spotlight.challengeTitle} · {toFaDigits(submissionCount)} پروژه‌ی ثبت‌شده
      </p>

      <Link
        href={`/challenges/${spotlight.challengeSlug}/${spotlight.problemId}`}
        className="inline-flex items-center gap-2 rounded-md bg-action px-4 py-2 text-body font-medium text-on-action shadow-sm transition-colors hover:bg-action-hover"
      >
        دیدن مسئله
        <ArrowLeft size={16} strokeWidth={1.5} />
      </Link>
    </section>
  );
}
