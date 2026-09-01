import Link from 'next/link';
import { MessageSquareQuote } from 'lucide-react';
import { ideaSummaryLine } from '@/lib/ideas/rules';
import type { DomainValidationRequest } from '@/lib/db/queries/home';

/**
 * Block 3 — «به کمکت نیاز دارند».
 *
 * Ideas sitting in a challenge that matches the viewer's own domain expertise.
 * This is the highest-value block on the page for the Domain Expert persona,
 * who the plan flags as most at risk of feeling marginal: it is the one place
 * that says "your non-technical judgement is specifically needed, here".
 *
 * The whole section renders nothing when the list is empty — an empty
 * "nobody needs you" box would do the exact opposite of its job.
 */
export function DomainValidationList({ requests }: { requests: DomainValidationRequest[] }) {
  if (requests.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquareQuote size={20} strokeWidth={1.5} className="text-info" />
        <h2 className="text-h3 text-fg">به کمکت نیاز دارند</h2>
      </div>
      <p className="mb-4 text-body-sm text-text-tertiary leading-relaxed">
        این ایده‌ها در حوزه‌ی تخصصی توست. نظرت درباره‌ی درست بودن صورت‌مسئله، بیش از هر تحلیل خودکاری ارزش دارد.
      </p>

      <div className="flex flex-col gap-3">
        {requests.map((r) => (
          <article
            key={r.ideaId}
            className="relative rounded-lg border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-body font-medium text-fg">
                <Link href={`/ideas/${r.ideaId}`} className="transition-colors hover:text-info after:absolute after:inset-0">
                  {r.title}
                </Link>
              </h3>
              <span className="shrink-0 rounded-sm bg-info-subtle px-2 py-0.5 text-micro text-fg">{r.domainName}</span>
            </div>
            <p className="mb-2 text-body-sm text-text-tertiary leading-relaxed line-clamp-2">
              {ideaSummaryLine(r.problemStatement)}
            </p>
            <p className="text-micro text-text-muted">
              {r.authorName} · {r.challengeTitle}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
