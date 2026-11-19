import Link from 'next/link';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/atoms/Avatar';
import { RoleBadge } from '@/components/atoms/RoleBadge';
import { toFaDigits } from '@/lib/format';
import type { SimilarPerson } from '@/lib/db/queries/home';

/**
 * Block 8 — «آدم‌هایی شبیه تو».
 *
 * The only place the "graph" the product is named after is actually visible to
 * a member: shared skills, counted, with a route to the person. The count is
 * shown because "you both know 6 of the same things" is a reason to reach out;
 * a bare list of names is not.
 */
export function SimilarPeople({ people }: { people: SimilarPerson[] }) {
  if (people.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <Users size={20} strokeWidth={1.5} className="text-info" />
        <h2 className="text-h3 text-fg">آدم‌هایی شبیه تو</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {people.map((p) => (
          <div
            key={p.userId}
            className="relative rounded-lg border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <Avatar name={p.name} size={32} />
              <div className="min-w-0">
                <p className="truncate text-body-sm text-fg">
                  {p.username ? (
                    <Link href={`/u/${p.username}`} className="transition-colors hover:text-info after:absolute after:inset-0">
                      {p.name}
                    </Link>
                  ) : (
                    p.name
                  )}
                </p>
                {p.roleTitle && <p className="truncate text-micro text-text-muted">{p.roleTitle}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RoleBadge role={p.roleBadge} />
              <span className="text-micro text-text-tertiary">
                {toFaDigits(p.sharedSkillCount)} مهارت مشترک
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
