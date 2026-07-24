import { ScrollText } from 'lucide-react';
import { IP_TERMS_LABEL_FA, type IpTerms } from '@/lib/submissions/rules';

// Shows the Problem's declared IP position + optional clarification before a
// builder submits. The formal terms body is a placeholder — real legal wording
// is pending review, so we do not invent it here.
export function IpTermsNotice({ ipTerms, ipTermsNote }: { ipTerms: IpTerms; ipTermsNote: string | null }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-canvas p-4">
      <div className="mb-2 flex items-center gap-2">
        <ScrollText size={16} strokeWidth={1.5} className="text-info" />
        <span className="text-body font-medium text-fg">شرایط مالکیت فکری (IP)</span>
      </div>
      <p className="text-body-sm text-fg">{IP_TERMS_LABEL_FA[ipTerms]}</p>
      {ipTermsNote && <p className="mt-2 text-body-sm text-text-tertiary leading-relaxed">{ipTermsNote}</p>}
      <p className="mt-3 text-body-sm text-text-muted leading-relaxed">متن حقوقی — نیازمند بازبینی حقوقی</p>
    </div>
  );
}
