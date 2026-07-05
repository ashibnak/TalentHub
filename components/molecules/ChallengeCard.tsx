import Link from 'next/link';
import { Target, FolderKanban } from 'lucide-react';
import { toFaDigits } from '@/lib/format';
import type { DirectoryChallenge } from '@/lib/db/queries/challenges';

// Challenges-directory card (plan §3.5): domain bucket with live problem/project counts.
export function ChallengeCard({ challenge }: { challenge: DirectoryChallenge }) {
  return (
    <Link
      href={`/challenges/${challenge.slug}`}
      className="block bg-surface border border-border-subtle rounded-lg p-6 hover:bg-surface-elevated transition-colors"
    >
      <h2 className="text-h3 text-white mb-2">{challenge.title}</h2>
      <p className="text-body-sm text-white/60 leading-relaxed mb-4 line-clamp-2">{challenge.description}</p>
      <div className="flex items-center gap-4 text-body-sm text-text-tertiary">
        <span className="flex items-center gap-1">
          <Target size={14} strokeWidth={1.5} />
          {toFaDigits(challenge.problemCount)} مسئله
        </span>
        <span className="flex items-center gap-1">
          <FolderKanban size={14} strokeWidth={1.5} />
          {toFaDigits(challenge.projectCount)} پروژه
        </span>
        {challenge.sponsorTeam && <span className="ms-auto text-info">{challenge.sponsorTeam}</span>}
      </div>
    </Link>
  );
}
