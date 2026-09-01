import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { toFaDigits } from '@/lib/format';
import type { VerificationInsight } from '@/lib/db/queries/home';

/**
 * Block 5 — what the AI analysis of the member's own repo actually implies.
 *
 * States a NEXT ACTION, not a compliment. The counts line is context only; the
 * body names the specific skill that lacked evidence and quotes the model's own
 * reason, because "۳ از ۵ تأیید شد" tells a member nothing they can act on.
 *
 * The reason text is the model's `evidence` field verbatim — it is a finding,
 * not separately-generated advice, so it is framed as "what was missing".
 */
export function VerificationInsightCard({ insight }: { insight: VerificationInsight }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck size={20} strokeWidth={1.5} className="text-info" />
        <h2 className="text-h3 text-fg">تحلیل مخزن پروژه‌ات</h2>
      </div>

      <div className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <p className="mb-3 text-body-sm text-text-tertiary">
          <Link href={`/projects/${insight.projectId}`} className="text-fg transition-colors hover:text-info">
            {insight.projectTitle}
          </Link>
          {' · '}
          {toFaDigits(insight.verifiedCount)} از {toFaDigits(insight.totalCount)} مهارت تأیید شد
        </p>

        {insight.gap ? (
          <>
            <p className="text-body text-fg leading-relaxed">
              برای <span dir="ltr" className="text-info">{insight.gap.skillName}</span> شواهد کافی پیدا نشد.
            </p>
            <p className="mt-2 text-body-sm text-text-tertiary leading-relaxed">{insight.gap.evidence}</p>
            <p className="mt-3 text-body-sm text-text-muted leading-relaxed">
              نمونه‌ای از این مهارت را در README اضافه کن — یک قطعه کد، نام کتابخانه، یا فایلی که آن را نشان می‌دهد —
              و پروژه را دوباره منتشر کن.
            </p>
          </>
        ) : (
          <p className="text-body text-fg leading-relaxed">
            همه‌ی مهارت‌های ادعاشده شواهد کافی داشتند. برای مهارت‌های تازه، پروژه‌ی بعدی‌ات را با لینک مخزن ثبت کن.
          </p>
        )}
      </div>
    </section>
  );
}
