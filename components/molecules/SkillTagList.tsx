import { SkillTag } from '@/components/atoms/SkillTag';

const MAX_VISIBLE_TAGS = 6;

export function SkillTagList({ tags }: { tags: { label: string; verified?: boolean }[] }) {
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = tags.length - visible.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((tag) => (
        <SkillTag key={tag.label} label={tag.label} verified={tag.verified} />
      ))}
      {hiddenCount > 0 && (
        <span className="bg-white/5 text-white/50 text-[11px] font-medium px-2 py-0.5 rounded-sm">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
