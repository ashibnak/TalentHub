import type { TaxonomySkill, SkillCategory } from '@/lib/db/queries/taxonomy';

// Grouped, toggle-pill checkboxes for picking skills — pure HTML/CSS (no client
// JS): an sr-only checkbox drives a `peer-checked` styled label, matching the
// directory filter chips. Submits the checked slugs under `name` (read with
// FormData.getAll).
const CATEGORY_ORDER: SkillCategory[] = ['language', 'framework', 'tool', 'concept', 'ai_tool'];
const CATEGORY_LABELS: Record<SkillCategory, string> = {
  language: 'زبان‌ها',
  framework: 'فریم‌ورک‌ها',
  tool: 'ابزارها',
  concept: 'مفاهیم',
  ai_tool: 'ابزارهای هوش مصنوعی',
};

export function SkillCheckboxes({
  name,
  skills,
  selected,
}: {
  name: string;
  skills: TaxonomySkill[];
  selected: string[];
}) {
  const chosen = new Set(selected);
  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: skills.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-surface p-3">
      <div className="flex flex-col gap-4">
        {byCategory.map((group) => (
          <div key={group.category}>
            <div className="mb-2 text-micro text-text-tertiary">{CATEGORY_LABELS[group.category]}</div>
            <div className="flex flex-wrap gap-2">
              {group.items.map((s) => (
                <label key={s.slug} className="cursor-pointer">
                  <input type="checkbox" name={name} value={s.slug} defaultChecked={chosen.has(s.slug)} className="peer sr-only" />
                  <span className="inline-block rounded-full border border-border px-3 py-1 text-body-sm text-text-tertiary transition-colors hover:bg-canvas peer-checked:border-action peer-checked:bg-action peer-checked:text-on-action peer-focus-visible:ring-2 peer-focus-visible:ring-info peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface">
                    {s.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
