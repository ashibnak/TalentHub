'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { labelClass, inputClass } from '@/lib/ui';
import type { IdeaChallengeOption } from '@/lib/db/queries/ideas';

/**
 * Narrow the ideas directory to one challenge. URL-driven like
 * DirectoryFilters — the control only rewrites the query string and the server
 * component re-renders the filtered list.
 */
export function IdeaChallengeFilter({ challenges }: { challenges: IdeaChallengeOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('challenge') ?? '';

  const onChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set('challenge', slug);
    else params.delete('challenge');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="mb-6">
      <label htmlFor="challenge-filter" className={labelClass}>
        فیلتر بر اساس چالش
      </label>
      <select
        id="challenge-filter"
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 w-full sm:max-w-xs ${inputClass}`}
      >
        <option value="">همه‌ی چالش‌ها</option>
        {challenges.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.title}
          </option>
        ))}
      </select>
    </div>
  );
}
