import { FlaskConical, Zap, Wrench, Rocket, ShieldCheck, type LucideIcon } from 'lucide-react';

// The 5 project stages (schema `project_stage`). Labels stay English (§7.5).
export type ProjectStage = 'experiment' | 'weekend_hack' | 'building' | 'shipped' | 'maintained';

// Color ladder from design system §5.4 (opacity/energy ladder + icon, not a rainbow).
const STAGE_CONFIG: Record<ProjectStage, { label: string; className: string; Icon: LucideIcon }> = {
  experiment: { label: 'Experiment', className: 'bg-white/8 text-white/70', Icon: FlaskConical },
  weekend_hack: { label: 'Weekend Hack', className: 'bg-info-muted text-white', Icon: Zap },
  building: { label: 'Building', className: 'bg-info text-surface', Icon: Wrench },
  shipped: { label: 'Shipped', className: 'bg-action text-white', Icon: Rocket },
  maintained: { label: 'Maintained', className: 'border border-white/40 text-white', Icon: ShieldCheck },
};

export function StageBadge({ stage }: { stage: ProjectStage }) {
  const { label, className, Icon } = STAGE_CONFIG[stage];
  return (
    <span
      className={`inline-flex items-center gap-1 ${className} text-micro px-2 py-0.5 rounded-sm shrink-0 whitespace-nowrap`}
    >
      <Icon size={14} strokeWidth={1.5} />
      {label}
    </span>
  );
}
