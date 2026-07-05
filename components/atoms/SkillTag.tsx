import { ShieldCheck } from 'lucide-react';

// Skill tag (design system §5.4). Verified skills carry a shield icon.
export function SkillTag({ label, verified }: { label: string; verified?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 bg-info-muted text-white text-micro px-2 py-0.5 rounded-sm">
      {verified && <ShieldCheck size={11} className="text-info" strokeWidth={1.5} />}
      {label}
    </span>
  );
}
