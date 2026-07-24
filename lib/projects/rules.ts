import { z } from 'zod';
import { isHttpUrl } from '@/lib/validation';
import { AI_TOOL_LABELS } from '@/lib/ai-tools';
import { firstErrorCode } from '@/lib/forms';

export const STAGES = ['experiment', 'weekend_hack', 'building', 'shipped', 'maintained'] as const;
export type Stage = (typeof STAGES)[number];

/**
 * Validated fields of the shared project form. `confirmed` is `z.literal(true)`
 * — the IP-confirmation checkbox is a legal safeguard, never auto-set. URLs go
 * through isHttpUrl (rejects javascript:/data: so a stored href is safe).
 */
export const ProjectFormSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(4000),
  stage: z.enum(STAGES),
  githubUrl: z.string().refine(isHttpUrl).nullable(),
  demoUrl: z.string().refine(isHttpUrl).nullable(),
  confirmed: z.literal(true),
});

// Ordered field→code map (matches the old top-to-bottom guard order exactly).
const PROJECT_FIELD_CODES = [
  ['title', 'title'],
  ['description', 'description'],
  ['stage', 'stage'],
  ['githubUrl', 'github'],
  ['demoUrl', 'demo'],
  ['confirmed', 'confirm'],
] as const;

export type ParsedProject = {
  title: string;
  description: string;
  stage: Stage;
  githubUrl: string | null;
  demoUrl: string | null;
  publish: boolean;
  skillSlugs: string[];
  toolSlugs: string[];
};

/** Parse + validate the project form. Returns an error CODE, or the parsed values. */
export function parseProjectForm(formData: FormData): { error: string } | ParsedProject {
  const parsed = ProjectFormSchema.safeParse({
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    stage: String(formData.get('stage') ?? 'experiment'),
    githubUrl: String(formData.get('githubUrl') ?? '').trim() || null,
    demoUrl: String(formData.get('demoUrl') ?? '').trim() || null,
    confirmed: formData.get('confirmed') === 'on',
  });
  if (!parsed.success) return { error: firstErrorCode(parsed.error, PROJECT_FIELD_CODES) };

  return {
    title: parsed.data.title,
    description: parsed.data.description,
    stage: parsed.data.stage,
    githubUrl: parsed.data.githubUrl,
    demoUrl: parsed.data.demoUrl,
    publish: formData.get('publish') === 'on',
    skillSlugs: [...new Set(formData.getAll('skills').map((s) => String(s)).filter(Boolean))],
    toolSlugs: [...new Set(formData.getAll('tools').map((s) => String(s)).filter((s) => s in AI_TOOL_LABELS))],
  };
}
