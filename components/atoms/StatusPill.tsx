export type BuildingStatus = 'building' | 'shipped' | 'idle';

// Labels stay English — platform status vocabulary (design system §7.5).
const STATUS_CONFIG: Record<BuildingStatus, { label: string; bg: string; text: string; dot: string }> = {
  building: { label: 'Currently building', bg: 'bg-info-subtle', text: 'text-info', dot: 'bg-info' },
  shipped: { label: 'Shipped', bg: 'bg-success-subtle', text: 'text-success', dot: 'bg-success' },
  idle: { label: 'Idle', bg: 'bg-fg/5', text: 'text-text-muted', dot: 'bg-fg/30' },
};

export function StatusPill({ status }: { status: BuildingStatus }) {
  const { label, bg, text, dot } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${bg} ${text} text-micro px-3 py-1 rounded-full leading-none`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
