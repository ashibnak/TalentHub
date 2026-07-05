'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import type { DirectoryFacets } from '@/lib/db/queries/facets';

/**
 * URL-driven directory filters (plan Week 5). The controls only rewrite the URL
 * query params; the server component re-renders the filtered list — no
 * client-side data fetching.
 */
export function DirectoryFilters({ facets, showSort = false }: { facets: DirectoryFacets; showSort?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedSkills = searchParams.getAll('skill');
  const selectedTools = searchParams.getAll('tool');
  const currentQ = searchParams.get('q') ?? '';
  const currentSort = searchParams.get('sort') ?? 'upvotes';

  const [search, setSearch] = useState(currentQ);
  const lastPushed = useRef(currentQ);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync from the URL only when it changed EXTERNALLY (e.g. cleared) — never
  // clobber characters typed while a debounced round-trip is still in flight.
  useEffect(() => {
    if (currentQ !== lastPushed.current) {
      setSearch(currentQ);
      lastPushed.current = currentQ;
    }
  }, [currentQ]);

  // Cancel any pending debounce on unmount.
  useEffect(() => () => clearTimeout(debounce.current), []);

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const onSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const v = value.trim();
      lastPushed.current = v;
      pushParams((p) => (v ? p.set('q', v) : p.delete('q')));
    }, 300);
  };

  const toggleMulti = (key: string, value: string) =>
    pushParams((p) => {
      const values = p.getAll(key);
      p.delete(key);
      const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
      for (const v of next) p.append(key, v);
    });

  const clearAll = () => {
    clearTimeout(debounce.current);
    lastPushed.current = '';
    setSearch('');
    router.replace(pathname, { scroll: false });
  };

  const hasActive =
    !!currentQ || selectedSkills.length > 0 || selectedTools.length > 0 || (showSort && currentSort !== 'upvotes');

  const chip = (active: boolean, activeClass: string) =>
    `text-body-sm px-3 py-1 rounded-full border transition-colors ${active ? activeClass : 'bg-surface text-fg border-border-subtle hover:border-border'}`;

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={16}
            strokeWidth={1.5}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجو…"
            aria-label="جستجو"
            className="w-full bg-surface border border-border focus:border-border-focus focus:bg-info-subtle rounded-md ps-9 pe-3 py-2 text-body text-fg placeholder:text-text-muted shadow-sm outline-none transition-colors"
          />
        </div>
        {showSort && (
          <select
            value={currentSort}
            onChange={(e) => pushParams((p) => (e.target.value === 'upvotes' ? p.delete('sort') : p.set('sort', e.target.value)))}
            aria-label="مرتب‌سازی"
            className="bg-surface border border-border focus:border-border-focus focus:bg-info-subtle rounded-md px-3 py-2 text-body text-fg shadow-sm outline-none transition-colors"
          >
            <option value="upvotes">پرطرفدارترین</option>
            <option value="newest">جدیدترین</option>
          </select>
        )}
        {hasActive && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-body-sm text-text-tertiary hover:text-fg transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
            پاک کردن
          </button>
        )}
      </div>

      {facets.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facets.skills.map((s) => {
            const active = selectedSkills.includes(s.slug);
            return (
              <button key={s.slug} type="button" aria-pressed={active} onClick={() => toggleMulti('skill', s.slug)} className={chip(active, 'bg-action text-white border-transparent')}>
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {facets.tools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facets.tools.map((t) => {
            const active = selectedTools.includes(t.slug);
            return (
              <button key={t.slug} type="button" aria-pressed={active} onClick={() => toggleMulti('tool', t.slug)} className={chip(active, 'bg-success text-white border-transparent')}>
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
