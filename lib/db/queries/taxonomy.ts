import { cache } from 'react';
import { asc } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { skills, domains } from '@/lib/db/schema';

export type SkillCategory = 'language' | 'framework' | 'tool' | 'concept' | 'ai_tool';

export type TaxonomySkill = {
  id: string;
  slug: string;
  name: string;
  category: SkillCategory;
};

/** The full skill taxonomy (all categories), for the add-skill / project-skill
 *  pickers. The existing `getFilterFacets` only returns options currently in use
 *  and excludes ai_tool — wrong for an editor, so this reads the base table. */
export const getAllSkills = cache(async (): Promise<TaxonomySkill[]> => {
  const db = getDb();
  return db
    .select({ id: skills.id, slug: skills.slug, name: skills.name, category: skills.category })
    .from(skills)
    .orderBy(asc(skills.name));
});

export type TaxonomyDomain = { id: string; slug: string; name: string };

/** All domains, for the onboarding wizard + profile editors. */
export const getAllDomains = cache(async (): Promise<TaxonomyDomain[]> => {
  const db = getDb();
  return db.select({ id: domains.id, slug: domains.slug, name: domains.name }).from(domains).orderBy(asc(domains.name));
});
