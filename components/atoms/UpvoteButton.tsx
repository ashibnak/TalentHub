'use client';

import { useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import { ThumbsUp } from 'lucide-react';
import { toggleUpvoteAction } from '@/lib/actions/upvotes';
import { toFaDigits } from '@/lib/format';

type Props = {
  projectId: string;
  count: number;
  hasUpvoted: boolean;
  isOwn: boolean; // hidden entirely on the viewer's own projects
  isSignedIn: boolean;
};

const base = 'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-body-sm transition-colors';
const activeCls = 'border-info-muted bg-info-subtle text-info';
const idleCls = 'border-border-subtle text-text-tertiary hover:text-info hover:border-border';

// Upvote toggle. Optimistic: the count moves instantly and rolls back if the
// server rejects. Own projects render nothing; signed-out viewers see the count
// but the control routes to /login. Design tokens only — no new colors.
export function UpvoteButton({ projectId, count, hasUpvoted, isOwn, isSignedIn }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(
    { count, hasUpvoted },
    (_state, next: { count: number; hasUpvoted: boolean }) => next,
  );
  const [pending, startTransition] = useTransition();

  if (isOwn) return null;

  if (!isSignedIn) {
    return (
      <Link href="/login" aria-label="برای رأی دادن وارد شوید" className={`${base} ${idleCls}`}>
        <ThumbsUp size={14} strokeWidth={1.5} />
        {toFaDigits(count)}
      </Link>
    );
  }

  function onClick() {
    const next = optimistic.hasUpvoted
      ? { count: optimistic.count - 1, hasUpvoted: false }
      : { count: optimistic.count + 1, hasUpvoted: true };
    startTransition(async () => {
      setOptimistic(next);
      await toggleUpvoteAction(projectId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={optimistic.hasUpvoted}
      aria-label={optimistic.hasUpvoted ? 'برداشتن رأی' : 'رأی دادن به این پروژه'}
      className={`${base} ${optimistic.hasUpvoted ? activeCls : idleCls} disabled:opacity-60`}
    >
      <ThumbsUp size={14} strokeWidth={1.5} className={optimistic.hasUpvoted ? 'fill-current' : undefined} />
      {toFaDigits(optimistic.count)}
    </button>
  );
}
