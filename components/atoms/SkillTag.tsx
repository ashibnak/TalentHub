import { ShieldCheck } from 'lucide-react';

export function SkillTag({ label, verified }: { label: string; verified?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[rgba(102,155,188,0.18)] text-white text-[11px] font-medium px-2 py-0.5 rounded-sm">
      {verified && <ShieldCheck size={11} className="text-[#669bbc]" strokeWidth={1.5} />}
      {label}
    </span>
  );
}
