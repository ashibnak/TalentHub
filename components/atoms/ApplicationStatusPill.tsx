import type { ApplicationStatus } from '@/lib/db/queries/opportunities';

// The hiring funnel, as a colored pill. Persian labels; colors from tokens.
const CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  applied: { label: 'ارسال‌شده', className: 'bg-fg/5 text-text-tertiary' },
  shortlisted: { label: 'منتخب اولیه', className: 'bg-info-subtle text-info' },
  next_call: { label: 'دعوت به گفتگو', className: 'bg-amber-400/15 text-amber-300' },
  accepted: { label: 'پذیرفته‌شده', className: 'bg-success-subtle text-success' },
  rejected: { label: 'رد شده', className: 'bg-red-400/15 text-red-300' },
};

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  const { label, className } = CONFIG[status];
  return <span className={`inline-block whitespace-nowrap ${className} text-micro px-2 py-0.5 rounded-full`}>{label}</span>;
}
