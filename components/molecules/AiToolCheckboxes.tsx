import { AI_TOOL_LABELS } from '@/lib/ai-tools';

// Toggle-pill checkboxes for the AI tools used to build a project. Values are the
// free-text `tool_slug`s stored in project_ai_tools (source of truth = the label
// map, NOT a DB table). Same JS-free peer-checked pattern as SkillCheckboxes.
const TOOLS = Object.entries(AI_TOOL_LABELS);

export function AiToolCheckboxes({ name, selected }: { name: string; selected: string[] }) {
  const chosen = new Set(selected);
  return (
    <div className="flex flex-wrap gap-2">
      {TOOLS.map(([slug, label]) => (
        <label key={slug} className="cursor-pointer">
          <input type="checkbox" name={name} value={slug} defaultChecked={chosen.has(slug)} className="peer sr-only" />
          <span className="inline-block rounded-full border border-border px-3 py-1 text-body-sm text-text-tertiary transition-colors hover:bg-canvas peer-checked:border-action peer-checked:bg-action peer-checked:text-on-action peer-focus-visible:ring-2 peer-focus-visible:ring-info peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}
