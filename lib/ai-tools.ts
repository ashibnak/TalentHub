// AI-tool display labels (English per design system §7.5). Shared by AiToolTag
// and the directory filters. Unknown slugs fall back to the raw slug.
export const AI_TOOL_LABELS: Record<string, string> = {
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

export const aiToolLabel = (slug: string): string => AI_TOOL_LABELS[slug] ?? slug;
