import type { IdeaStatus } from '@/lib/ideas/rules';

// Idea lifecycle state. Persian labels, following PublishBadge's precedent:
// these are workflow states a member reads about their own submission, not
// platform vocabulary like Spotlight/Shipped (design system §7.5).
const CONFIG: Record<IdeaStatus, { label: string; className: string }> = {
  draft: { label: 'پیش‌نویس', className: 'bg-fg/5 text-text-tertiary' },
  submitted: { label: 'ثبت‌شده', className: 'bg-info-subtle text-info' },
  needs_work: { label: 'نیاز به بازنگری', className: 'bg-highlight-subtle text-highlight' },
  approved: { label: 'تأییدشده', className: 'bg-success-subtle text-success' },
  rejected: { label: 'رد شده', className: 'bg-action-subtle text-state-error' },
};

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  const { label, className } = CONFIG[status];
  return <span className={`inline-block ${className} text-micro px-2 py-0.5 rounded-full shrink-0`}>{label}</span>;
}
