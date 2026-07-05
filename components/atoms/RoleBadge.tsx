import { ROLE_BADGE_LABEL, type RoleBadge as RoleBadgeType } from '@/lib/users/role-badge';

// Identity marker, not a rank. Subtle micro-text badge, NOT colored or
// competitive (design system + plan Week 3 Prompt 7). Labels stay English (§7.5).
export function RoleBadge({ role }: { role: RoleBadgeType }) {
  return (
    <span className="bg-white/5 text-text-tertiary text-micro px-2 py-0.5 rounded-sm">
      {ROLE_BADGE_LABEL[role]}
    </span>
  );
}
