import { Megaphone } from 'lucide-react';
import { formatFaDate } from '@/lib/format';
import type { ChangelogEntry } from '@/lib/changelog';

/**
 * Block 9 — product news, read straight from CHANGELOG.md.
 *
 * Bottom of the page on purpose: the ordering principle here is TIME PRESSURE,
 * and release notes are the most evergreen thing on the screen.
 *
 * "Unreleased" is shown as «به‌زودی» rather than a version, since a member has
 * no use for a semver string.
 */
export function ProductNews({ entries }: { entries: ChangelogEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone size={20} strokeWidth={1.5} className="text-info" />
        <h2 className="text-h3 text-fg">تازه‌های محصول</h2>
      </div>

      <div className="flex flex-col gap-3">
        {entries.map((e) => (
          <article key={e.version} className="rounded-lg border border-border-subtle bg-surface p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <span className="text-body font-medium text-fg">
                {e.title || (/unreleased/i.test(e.version) ? 'به‌زودی' : e.version)}
              </span>
              {e.date && <span className="text-micro text-text-muted">{formatFaDate(e.date)}</span>}
            </div>
            {e.highlights.length > 0 && (
              <ul className="flex flex-col gap-1">
                {e.highlights.map((h, i) => (
                  <li key={i} className="text-body-sm text-text-tertiary leading-relaxed line-clamp-2">
                    · {h}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
