import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import { getPeopleDirectory } from '@/lib/db/queries/users';
import { UserCard } from '@/components/molecules/UserCard';
import { EmptyState } from '@/components/atoms/EmptyState';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'افراد — AIGraph' };

export default async function PeoplePage() {
  const people = await getPeopleDirectory();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-h1 mb-2">افراد</h1>
      <p className="text-body text-text-tertiary mb-8">{toFaDigits(people.length)} عضو در شبکه</p>
      {people.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((u) => (
            <UserCard key={u.username} user={u} />
          ))}
        </div>
      ) : (
        <EmptyState icon={Users} title="هنوز عضوی به شبکه نپیوسته" />
      )}
    </main>
  );
}
