import { toFaDigits } from '@/lib/format';

export type DomainExpertiseItem = {
  slug: string;
  name: string; // 'منابع انسانی · Human Resources'
  yearsExperience: number | null;
};

// Domain expertise on the public profile (plan Week 3 Prompt 6/8) — a small
// list with years where provided, e.g. "منابع انسانی · Human Resources · ۱۰ سال".
export function DomainExpertiseList({ domains }: { domains: DomainExpertiseItem[] }) {
  if (domains.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {domains.map((d) => (
        <li key={d.slug} className="text-body-sm text-white/80">
          {d.name}
          {d.yearsExperience != null && (
            <span className="text-text-muted"> · {toFaDigits(d.yearsExperience)} سال</span>
          )}
        </li>
      ))}
    </ul>
  );
}
