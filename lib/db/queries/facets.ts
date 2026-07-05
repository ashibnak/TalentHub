import { cache } from 'react';
import { eq, ne } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { skills, userSkills, projectSkills, projectAiTools } from '@/lib/db/schema';
import { aiToolLabel } from '@/lib/ai-tools';

/** Facet option set passed to <DirectoryFilters/>. */
export type DirectoryFacets = {
  skills: { slug: string; name: string }[];
  tools: { slug: string; label: string }[];
};

/**
 * Filter options actually in use. Skills are returned PER DIRECTORY (people vs
 * projects) so every offered chip can match at least one row on that page, and
 * `ai_tool`-category skills are excluded (AI tools have their own facet).
 */
export const getFilterFacets = cache(async (): Promise<{
  peopleSkills: { slug: string; name: string }[];
  projectSkills: { slug: string; name: string }[];
  tools: { slug: string; label: string }[];
}> => {
  const db = getDb();
  const [userSkillRows, projectSkillRows, toolRows] = await Promise.all([
    db.selectDistinct({ slug: skills.slug, name: skills.name }).from(userSkills).innerJoin(skills, eq(userSkills.skillId, skills.id)).where(ne(skills.category, 'ai_tool')),
    db.selectDistinct({ slug: skills.slug, name: skills.name }).from(projectSkills).innerJoin(skills, eq(projectSkills.skillId, skills.id)).where(ne(skills.category, 'ai_tool')),
    db.selectDistinct({ slug: projectAiTools.toolSlug }).from(projectAiTools),
  ]);

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  return {
    peopleSkills: [...userSkillRows].sort(byName),
    projectSkills: [...projectSkillRows].sort(byName),
    tools: toolRows.map((t) => ({ slug: t.slug, label: aiToolLabel(t.slug) })).sort((a, b) => a.label.localeCompare(b.label)),
  };
});
