import Link from 'next/link';
import { Avatar } from '@/components/atoms/Avatar';
import { RoleBadge } from '@/components/atoms/RoleBadge';
import { SkillTagList } from '@/components/molecules/SkillTagList';
import type { DirectoryUser } from '@/lib/db/queries/users';

// People-directory card (design system §5.6): avatar, name, role badge, role
// title, and up to a few skills (SkillTagList collapses at 6).
export function UserCard({ user }: { user: DirectoryUser }) {
  return (
    <Link
      href={`/u/${user.username}`}
      className="block bg-surface border border-border-subtle rounded-lg p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={user.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-body font-semibold text-fg truncate">{user.name}</h2>
            <RoleBadge role={user.roleBadge} />
          </div>
          {user.roleTitle && <p className="text-body-sm text-info truncate">{user.roleTitle}</p>}
        </div>
      </div>
      {user.topSkills.length > 0 && (
        <SkillTagList tags={user.topSkills.map((s) => ({ slug: s.slug, label: s.name, verified: s.verified }))} />
      )}
    </Link>
  );
}
