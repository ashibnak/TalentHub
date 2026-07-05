import { SkillTag } from '@/components/atoms/SkillTag';

// Compact skill list for directory/user cards (plan Week 5): shows the first 6
// tags then a +N collapse chip (design system §5.4). The full public profile
// uses ProfileSkills instead, which groups by category and never collapses.
const MAX_VISIBLE_TAGS = 6;

type Tag = { slug?: string; label: string; verified?: boolean };

export function SkillTagList({ tags }: { tags: Tag[] }) {
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenCount = tags.length - visible.length;

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((tag) => (
        // Key on the unique slug when available; skill display names are not unique.
        <SkillTag key={tag.slug ?? tag.label} label={tag.label} verified={tag.verified} />
      ))}
      {hiddenCount > 0 && (
        <span className="bg-white/5 text-text-muted text-micro px-2 py-0.5 rounded-sm">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
