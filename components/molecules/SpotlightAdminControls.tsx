import { Sparkles } from 'lucide-react';
import { startSpotlightAction, endSpotlightAction } from '@/lib/actions/spotlight';
import { btnSecondary } from '@/lib/ui';
import type { SpotlightRejection } from '@/lib/spotlight/rules';

type Props = {
  problemId: string;
  returnTo: string;
  /** null when the problem may be spotlighted; otherwise why it may not. */
  rejection: SpotlightRejection | null;
};

// Why the control is unavailable — admin-facing, so the reason is explicit
// rather than a disabled button with no explanation.
const REASON: Record<SpotlightRejection, string> = {
  problem_not_found: 'این مسئله پیدا نشد.',
  problem_not_active: 'فقط مسئله‌های active را می‌توان Spotlight کرد.',
  already_spotlight: '',
  spotlight_taken: 'یک Spotlight دیگر در جریان است. اول آن را ببند.',
};

/**
 * Admin-only Spotlight controls on the problem detail page: open a window, or
 * close the running one early. Rendered only for admins by the page.
 */
export function SpotlightAdminControls({ problemId, returnTo, rejection }: Props) {
  // Already the live spotlight → the only useful control is ending it.
  if (rejection === 'already_spotlight') {
    return (
      <form action={endSpotlightAction} className="mb-6">
        <input type="hidden" name="problemId" value={problemId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <button type="submit" className={btnSecondary}>
          بستن زودهنگام Spotlight
        </button>
      </form>
    );
  }

  if (rejection) {
    return <p className="mb-6 text-body-sm text-text-muted">{REASON[rejection]}</p>;
  }

  return (
    <form action={startSpotlightAction} className="mb-6">
      <input type="hidden" name="problemId" value={problemId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className={`inline-flex items-center gap-2 ${btnSecondary}`}>
        <Sparkles size={16} strokeWidth={1.5} />
        Spotlight این مسئله
      </button>
    </form>
  );
}
