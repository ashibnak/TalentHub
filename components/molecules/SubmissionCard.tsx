'use client';

import { useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { toFaDigits } from '@/lib/format';
import type { ProblemSubmission } from '@/lib/db/queries/submissions';

// A submitted project: title → project, owner → profile, vote count, and the
// solution write-up rendered as (sanitized) Markdown, collapsed past ~4 lines.
const COLLAPSE_CHARS = 220; // longer write-ups get the "بیشتر" toggle

export function SubmissionCard({ submission }: { submission: ProblemSubmission }) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = submission.solutionDescription.length > COLLAPSE_CHARS;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link href={`/projects/${submission.projectId}`} className="min-w-0 truncate text-body font-semibold text-fg transition-colors hover:text-info">
          {submission.projectTitle}
        </Link>
        <span className="shrink-0 text-body-sm text-text-tertiary">{toFaDigits(submission.upvoteCount)} رأی</span>
      </div>
      <Link href={`/u/${submission.ownerUsername}`} className="text-body-sm text-info transition-colors hover:text-fg">
        {submission.ownerName}
      </Link>

      <div
        className="mt-3 text-body-sm text-fg/90 leading-relaxed [&_a]:text-info [&_code]:text-info [&_li]:ms-4 [&_li]:list-disc [&_p]:mb-2 [&_strong]:font-semibold"
        style={collapsible && !expanded ? { maxHeight: '5.5rem', overflow: 'hidden' } : undefined}
      >
        <ReactMarkdown>{submission.solutionDescription}</ReactMarkdown>
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-body-sm text-info transition-colors hover:text-fg"
        >
          {expanded ? 'کمتر' : 'بیشتر'}
        </button>
      )}
    </div>
  );
}
