import { CircleCheck } from 'lucide-react';

// AI-tool tag (design system §5.4) — CircleCheck icon (distinct from the skill
// shield). Tool names stay English (§7.5).
const AI_TOOL_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  v0: 'v0',
  bolt: 'Bolt',
  lovable: 'Lovable',
  chatgpt: 'ChatGPT',
  windsurf: 'Windsurf',
  copilot: 'GitHub Copilot',
  'openai-api': 'OpenAI API',
  'claude-api': 'Claude API',
};

export function AiToolTag({ slug }: { slug: string }) {
  const label = AI_TOOL_LABELS[slug] ?? slug;
  return (
    <span className="inline-flex items-center gap-1 bg-info-muted text-white text-micro px-2 py-0.5 rounded-sm">
      <CircleCheck size={11} className="text-info" strokeWidth={1.5} />
      {label}
    </span>
  );
}
