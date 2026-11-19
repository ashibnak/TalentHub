import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Product news, parsed from CHANGELOG.md.
 *
 * The changelog is already maintained and well structured, so reusing it costs
 * nothing to keep current — which is precisely why this is a parser and NOT a
 * CMS or an admin editor. Read once per server process (the file only changes
 * on deploy), and every failure degrades to an empty list so the block renders
 * nothing rather than breaking the page.
 */

export type ChangelogEntry = {
  /** e.g. "0.11.0" or "Unreleased". */
  version: string;
  /** ISO date when the heading carries one. */
  date: string | null;
  /** Headline after the date, when present. */
  title: string | null;
  /** First few bullet lines, markdown stripped. */
  highlights: string[];
};

const MAX_HIGHLIGHTS = 3;

/** Strip the markdown a heading/bullet may carry — bold, code, links. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [label](url) → label
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse the raw file. Exported separately from the reader so it is testable. */
export function parseChangelog(markdown: string, limit = 2): ChangelogEntry[] {
  const lines = markdown.split(/\r?\n/);
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const line of lines) {
    // "## [0.11.0] — 2026-07-23 — Weekly Leaderboard 🏆" / "## [Unreleased]"
    const heading = line.match(/^##\s+\[([^\]]+)\]\s*(.*)$/);
    if (heading) {
      if (current) entries.push(current);
      if (entries.length >= limit) break;

      const rest = heading[2] ?? '';
      const date = rest.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
      // Whatever follows the date (after an em/en dash) is the headline.
      const title = rest
        .replace(/^[\s—–-]*/, '')
        .replace(/^\d{4}-\d{2}-\d{2}[\s—–-]*/, '')
        .trim();

      current = { version: heading[1], date, title: title || null, highlights: [] };
      continue;
    }

    if (!current || current.highlights.length >= MAX_HIGHLIGHTS) continue;

    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      const text = stripMarkdown(bullet[1]);
      if (text) current.highlights.push(text);
    }
  }

  if (current && entries.length < limit) entries.push(current);
  return entries.slice(0, limit);
}

let cached: ChangelogEntry[] | null = null;

/** Top entries from the repo's CHANGELOG.md. Never throws. */
export function getChangelogEntries(limit = 2): ChangelogEntry[] {
  if (cached) return cached.slice(0, limit);
  try {
    const raw = readFileSync(join(process.cwd(), 'CHANGELOG.md'), 'utf8');
    cached = parseChangelog(raw, limit);
  } catch (err) {
    console.error('[home.changelog] could not read CHANGELOG.md', err);
    cached = [];
  }
  return cached.slice(0, limit);
}
