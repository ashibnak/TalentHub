import { ROLE_BADGE_LABEL, type RoleBadge as RoleBadgeType } from '@/lib/users/role-badge';

// Identity marker, not a rank — subtle neutral chip. Labels stay English (§7.5).
export function RoleBadge({ role }: { role: RoleBadgeType }) {
  return (
    <span className="bg-fg/5 text-text-tertiary text-micro px-2 py-0.5 rounded-sm">
      {ROLE_BADGE_LABEL[role]}
    </span>
  );
}
