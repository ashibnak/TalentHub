export type BuildingStatus = 'building' | 'shipped' | 'idle';

const STATUS_CONFIG: Record<BuildingStatus, { label: string; bg: string; text: string; dot: string }> = {
  building: { label: 'Currently building', bg: 'bg-[rgba(102,155,188,0.18)]', text: 'text-[#669bbc]', dot: 'bg-[#669bbc]' },
  shipped: { label: 'Shipped', bg: 'bg-white/10', text: 'text-white', dot: 'bg-white' },
  idle: { label: 'Idle', bg: 'bg-white/5', text: 'text-white/50', dot: 'bg-white/40' },
};

export function StatusPill({ status }: { status: BuildingStatus }) {
  const { label, bg, text, dot } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 ${bg} ${text} text-[11px] font-medium px-3 py-1 rounded-full leading-none`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
