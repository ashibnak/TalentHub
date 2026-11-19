import { ScrollText } from 'lucide-react';
import { IP_TERMS_LABEL_FA, type IpTerms } from '@/lib/submissions/rules';

/**
 * The ownership position an idea declared at intake.
 *
 * Wording comes from IP_TERMS_LABEL_FA — the same strings the Problem-side
 * IpTermsNotice uses — so "مالکیت با سازنده می‌ماند" can never drift into two
 * slightly different sentences across the app. Separate component from
 * IpTermsNotice because an idea has no `ipTermsNote` and needs no
 * pre-submission framing; it is a stated fact about an existing record.
 */
export function IdeaIpTerms({ ipTerms }: { ipTerms: IpTerms }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-canvas p-4">
      <div className="mb-2 flex items-center gap-2">
        <ScrollText size={16} strokeWidth={1.5} className="text-info" />
        <span className="text-body font-medium text-fg">مالکیت فکری</span>
      </div>
      <p className="text-body-sm text-fg">{IP_TERMS_LABEL_FA[ipTerms]}</p>
      <p className="mt-3 text-body-sm text-text-muted leading-relaxed">
        اگر کسی دیگر این ایده را بسازد، همین شرایط مبنا قرار می‌گیرد.
      </p>
    </div>
  );
}
