import { ShieldCheck } from 'lucide-react';
import { formatFaDate } from '@/lib/format';

/** Where a verified skill's evidence came from (PROJECT_PLAN §3, step 6: the
 *  user must be able to see WHY a skill was verified). */
export type SkillVerification = {
  /** `owner/repo`, or 'بررسی دستی' for an admin's manual verification. */
  source: string;
  verifiedAt: Date | string;
  /** True when a human admin verified it rather than the AI pipeline. */
  manual?: boolean;
};

// Skill tag (design system §5.4). Verified skills carry an emerald shield.
//
// ⚠️ Design decision needed: DESIGN_SYSTEM.md has no tooltip spec (§5 defines
// button/input/badge/pill/avatar/card only). This uses a CSS-only popover built
// from existing tokens — surface-elevated ground, border-subtle edge, rounded-md,
// text-micro — and opens on hover AND keyboard focus so it isn't mouse-only.
// A human should either bless this as the tooltip pattern in §5 or replace it.
export function SkillTag({
  label,
  verified,
  verification,
}: {
  label: string;
  verified?: boolean;
  verification?: SkillVerification | null;
}) {
  const tag = (
    <span className="inline-flex items-center gap-1 bg-info-subtle font-latin text-fg text-micro px-2 py-0.5 rounded-sm">
      {verified && <ShieldCheck size={11} className="text-success" strokeWidth={1.5} />}
      {label}
    </span>
  );

  if (!verified || !verification) return tag;

  const evidence = verification.manual
    ? `تأیید دستی توسط مدیر · ${formatFaDate(verification.verifiedAt)}`
    : `تأییدشده بر اساس ${verification.source} · ${formatFaDate(verification.verifiedAt)}`;

  return (
    <span className="group relative inline-flex" tabIndex={0}>
      {tag}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full start-0 z-10 mb-2 hidden w-max max-w-xs rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-micro leading-relaxed text-text-tertiary shadow-md group-hover:block group-focus:block"
      >
        {evidence}
      </span>
    </span>
  );
}
