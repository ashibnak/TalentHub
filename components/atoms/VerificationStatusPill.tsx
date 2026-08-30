export type VerificationRunStatus = 'pending' | 'success' | 'failed';

// Admin-facing run state. Labels stay English — this is platform/ops vocabulary
// on an admin screen (design system §7.5, same rule as the admin table headers).
const CONFIG: Record<VerificationRunStatus, { label: string; className: string; dot: string }> = {
  pending: { label: 'Pending', className: 'bg-highlight-subtle text-highlight', dot: 'bg-highlight' },
  success: { label: 'Success', className: 'bg-success-subtle text-success', dot: 'bg-success' },
  failed: { label: 'Failed', className: 'bg-action-subtle text-state-error', dot: 'bg-state-error' },
};

export function VerificationStatusPill({ status }: { status: VerificationRunStatus }) {
  const { label, className, dot } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className} text-micro px-3 py-1 rounded-full leading-none shrink-0`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
