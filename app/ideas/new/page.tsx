import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { getIdeaChallengeOptions } from '@/lib/db/queries/ideas';
import { createIdeaAction } from '@/lib/actions/ideas';
import { IdeaForm } from '@/components/molecules/IdeaForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ایده‌ی جدید — AIGraph' };

/**
 * ⚠️ This page deliberately renders NO other ideas — no list, no sidebar, no
 * count, not even "N ایده تا امروز". Seeing many prior ideas narrows what a
 * participant produces, and framing the page competitively makes it worse.
 * The only outbound link is «بازگشت», and browsing lives on /ideas, after
 * submission. Do not add a feed here.
 */
export default async function NewIdeaPage() {
  const user = await requireUser(); // auth gate — redirects to /login if signed out
  const challenges = await getIdeaChallengeOptions(user.orgId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {/* Deliberately links to the author's OWN ideas, never to the public
          directory — this page must not become a doorway to other people's. */}
      <Link href="/ideas/mine" className="text-body-sm text-text-tertiary transition-colors hover:text-fg">
        → ایده‌های من
      </Link>
      <h1 className="text-h1 mb-1 mt-3">ایده‌ی جدید</h1>
      <p className="text-body-sm text-text-tertiary mb-8 leading-relaxed">
        لازم نیست برنامه‌نویس باشی. یک مسئله‌ی واقعی از کار روزمره‌ات را توضیح بده و بگو چطور می‌شود بهترش کرد — پنج
        فیلد، نه بیشتر.
      </p>

      <section className="rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
        <IdeaForm action={createIdeaAction} challenges={challenges} submitLabel="ذخیره‌ی پیش‌نویس" />
      </section>
    </main>
  );
}
