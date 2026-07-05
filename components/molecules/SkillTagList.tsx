import { SkillTag } from '@/components/atoms/SkillTag';

// Tag collapse convention (design system §5.4): show first 6, then a +N chip.
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
        <span className="bg-white/5 text-text-muted text-micro px-2 py-0.5 rounded-sm">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
