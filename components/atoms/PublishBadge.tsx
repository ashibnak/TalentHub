// Draft vs published state for a project (owner-facing lists).
const CONFIG = {
  draft: { label: 'پیش‌نویس', className: 'bg-fg/5 text-text-tertiary' },
  published: { label: 'منتشرشده', className: 'bg-success-subtle text-success' },
} as const;

export function PublishBadge({ status }: { status: 'draft' | 'published' }) {
  const { label, className } = CONFIG[status];
  return <span className={`inline-block ${className} text-micro px-2 py-0.5 rounded-full shrink-0`}>{label}</span>;
}
