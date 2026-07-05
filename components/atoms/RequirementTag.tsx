import { Check } from 'lucide-react';

// A required-skill tag on an opportunity. For a signed-in seeker, `met` marks
// the skills they already have (✓, success tint); undefined = neutral viewer.
export function RequirementTag({ label, met }: { label: string; met?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-micro px-2 py-0.5 rounded-sm ${
        met ? 'bg-success-subtle text-success' : 'bg-fg/5 text-text-tertiary'
      }`}
    >
      {met && <Check size={11} strokeWidth={1.5} />}
      {label}
    </span>
  );
}
