import type { ApplicationStatus } from '@/lib/db/queries/opportunities';

// The hiring funnel, as a colored pill. Persian labels; colors from tokens.
const CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  applied: { label: 'ارسال‌شده', className: 'bg-fg/5 text-text-tertiary' },
  shortlisted: { label: 'منتخب اولیه', className: 'bg-info-subtle text-info' },
  next_call: { label: 'دعوت به گفتگو', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'پذیرفته‌شده', className: 'bg-success-subtle text-success' },
  rejected: { label: 'رد شده', className: 'bg-red-50 text-red-600' },
};

export function ApplicationStatusPill({ status }: { status: ApplicationStatus }) {
  const { label, className } = CONFIG[status];
  return <span className={`inline-block ${className} text-micro px-2 py-0.5 rounded-full`}>{label}</span>;
}
