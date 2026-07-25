import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MailX } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { hashToken } from '@/lib/auth/session-token';
import { findInvitationByTokenHash } from '@/lib/db/queries/invitations';
import { checkInviteUsable, type PersonaHint } from '@/lib/invitations/rules';
import { AcceptInviteForm } from '@/components/molecules/AcceptInviteForm';
import { LogoMark } from '@/components/layout/LogoMark';
import { EmptyState } from '@/components/atoms/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'دعوت به AIGraph' };

// Persona-aware welcome copy (plan Week 2 Prompt 3, adapted to link-first flow).
const PERSONA_WELCOME: Record<PersonaHint, string> = {
  builder:
    'این‌جا جاییه که چیزهایی که با Cursor، Claude Code و ابزارهای AI می‌سازی دیده می‌شن — پروژه‌هات را ثبت می‌کنی و مهارت‌هات از روی GitHub تأیید می‌شه.',
  domain_expert:
    'نیاز نیست کد بنویسی. این‌جا تخصص حوزه‌ات ارزشه — تجربه‌ات در HR، مالی، بازاریابی یا هر حوزه‌ی دیگر، راهنمای کسانی می‌شه که با AI می‌سازند.',
  hybrid:
    'هم می‌سازی، هم حوزه‌ات را می‌شناسی — این‌جا هر دو مسیر کنار هم دیده می‌شن: پروژه‌هات و تخصص حوزه‌ای‌ات.',
  unknown: 'این‌جا شبکه‌ی استعدادهای AI سازمانه — جایی که ساختن و تخصص، معیارند نه رزومه.',
};

const REJECTION_COPY: Record<string, { title: string; hint: string }> = {
  not_found: { title: 'این لینک دعوت معتبر نیست', hint: 'آدرس را کامل کپی کرده‌ای؟ اگر مشکل ماند، از مدیر یک لینک تازه بگیر.' },
  used: { title: 'این دعوت قبلاً استفاده شده', hint: 'اگر خودت استفاده‌اش کرده‌ای، از صفحه‌ی ورود وارد شو.' },
  expired: { title: 'این دعوت منقضی شده', hint: 'لینک‌های دعوت ۷ روز اعتبار دارند — از مدیر یک لینک تازه بگیر.' },
};

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (user) redirect(user.isAdmin ? '/admin' : '/home');

  const invitation = await findInvitationByTokenHash(hashToken(token));
  const rejection = checkInviteUsable({ invitation });

  if (rejection) {
    const copy = REJECTION_COPY[rejection];
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <EmptyState icon={MailX} title={copy.title} hint={copy.hint} />
        <p className="mt-4 text-center">
          <Link href="/login" className="text-body text-info transition-colors hover:text-fg">
            رفتن به صفحه‌ی ورود
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <LogoMark size={48} />
        <h1 className="text-h2">به AIGraph دعوت شده‌ای</h1>
        <p className="text-body leading-relaxed text-text-tertiary">{PERSONA_WELCOME[invitation!.personaHint]}</p>
        <p className="text-body-sm text-text-muted" dir="ltr">
          {invitation!.email}
        </p>
      </div>
      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <AcceptInviteForm token={token} />
      </section>
    </main>
  );
}
