import { SkillTag } from '@/components/atoms/SkillTag';

type SkillCategory = 'language' | 'framework' | 'tool' | 'concept' | 'ai_tool';
type Skill = { slug: string; name: string; category: SkillCategory; verified: boolean };

const CATEGORY_ORDER: SkillCategory[] = ['language', 'framework', 'tool', 'concept', 'ai_tool'];
const CATEGORY_LABEL: Record<SkillCategory, string> = {
  language: 'زبان‌ها',
  framework: 'فریم‌ورک‌ها',
  tool: 'ابزارها',
  concept: 'مفاهیم',
  ai_tool: 'ابزارهای AI',
};

/**
 * Public-profile skills, grouped by category with every skill shown and its
 * verified marker visible (plan Week 3 Prompt 8). Unlike the compact
 * SkillTagList used on directory cards, nothing is collapsed here — a verified
 * skill must never be hidden behind a +N chip.
 */
export function ProfileSkills({ skills }: { skills: Skill[] }) {
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: skills.filter((s) => s.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ category, items }) => (
        <div key={category}>
          <p className="text-micro text-text-tertiary mb-2">{CATEGORY_LABEL[category]}</p>
          <div className="flex flex-wrap gap-2">
            {items.map((s) => (
              <SkillTag key={s.slug} label={s.name} verified={s.verified} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
