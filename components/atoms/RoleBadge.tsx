import { Briefcase, Blend, Code, type LucideIcon } from 'lucide-react';
import { ROLE_BADGE_LABEL, type RoleBadge as RoleBadgeType } from '@/lib/users/role-badge';

// Identity marker, not a rank. The English word stays (§7.5); the icon makes
// the three personas scannable without reading the chip.
const ROLE_ICON: Record<RoleBadgeType, LucideIcon> = {
  builder: Code,
  domain_expert: Briefcase,
  hybrid: Blend,
};

export function RoleBadge({ role }: { role: RoleBadgeType }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className="inline-flex items-center gap-1 bg-fg/5 font-latin text-micro text-text-tertiary px-2 py-0.5 rounded-sm">
      <Icon size={11} strokeWidth={1.5} aria-hidden="true" />
      {ROLE_BADGE_LABEL[role]}
    </span>
  );
}
