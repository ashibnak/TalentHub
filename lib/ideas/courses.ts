/**
 * The seven Orbit courses named on the Campus landing. Each points at a lesson
 * already in the pool (scripts/seed-lessons.ts). Opening one records the key;
 * the video stays on the provider site.
 */
export const ORBIT_COURSES = [
  { key: 'llm-architecture', title: 'معماری سیستم‌های مبتنی بر LLM', lessonSlug: 'anthropic-cookbook' },
  { key: 'agentic-workflow', title: 'مهندسی Agentic Workflow', lessonSlug: 'hf-agents-course' },
  { key: 'tool-calling', title: 'Tool Calling، API و MCP', lessonSlug: 'langchain-academy' },
  { key: 'context-rag', title: 'Context Engineering و RAG', lessonSlug: 'openai-cookbook' },
  { key: 'memory-data', title: 'Memory، State و Data Architecture', lessonSlug: 'hf-nlp-course' },
  { key: 'agent-eval', title: 'Agent Evaluation و Observability', lessonSlug: 'ms-ai-agents-beginners' },
  { key: 'ai-security', title: 'AI Security، Red Teaming و Deployment', lessonSlug: 'openai-safety-best-practices' },
] as const;

export type OrbitCourseKey = (typeof ORBIT_COURSES)[number]['key'];

export function orbitCourse(key: string) {
  return ORBIT_COURSES.find((course) => course.key === key) ?? null;
}
