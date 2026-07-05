import type { LucideIcon } from 'lucide-react';

// Empty-state pattern (design system §6.2): icon + inviting Persian copy.
export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="text-info mx-auto mb-3" size={32} strokeWidth={1.5} />
      <p className="text-body text-white mb-2">{title}</p>
      {hint && <p className="text-body-sm text-text-muted">{hint}</p>}
    </div>
  );
}
