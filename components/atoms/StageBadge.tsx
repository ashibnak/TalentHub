import { FlaskConical, Zap, Wrench, Rocket, ShieldCheck, type LucideIcon } from 'lucide-react';

// The 5 project stages (schema `project_stage`). Labels stay English (§7.5).
export type ProjectStage = 'experiment' | 'weekend_hack' | 'building' | 'shipped' | 'maintained';

// Energy ladder: neutral → light indigo → indigo → emerald (shipped) → outline.
const STAGE_CONFIG: Record<ProjectStage, { label: string; className: string; Icon: LucideIcon }> = {
  experiment: { label: 'Experiment', className: 'bg-fg/5 text-text-tertiary', Icon: FlaskConical },
  weekend_hack: { label: 'Weekend Hack', className: 'bg-info-subtle text-info', Icon: Zap },
  building: { label: 'Building', className: 'bg-info text-white', Icon: Wrench },
  shipped: { label: 'Shipped', className: 'bg-success text-white', Icon: Rocket },
  maintained: { label: 'Maintained', className: 'border border-border text-text-tertiary', Icon: ShieldCheck },
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
