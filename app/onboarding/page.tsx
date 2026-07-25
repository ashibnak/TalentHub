import type { Metadata } from 'next';
import { requireOnboardingUser } from '@/lib/auth/session';
import { getAllDomains, getAllSkills } from '@/lib/db/queries/taxonomy';
import { OnboardingWizard } from '@/components/molecules/OnboardingWizard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'شروع — AIGraph' };

export default async function OnboardingPage() {
  const user = await requireOnboardingUser();
  const [domains, skills] = await Promise.all([getAllDomains(), getAllSkills()]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <OnboardingWizard
        userName={user.name}
        domains={domains.map((d) => ({ slug: d.slug, name: d.name }))}
        skills={skills.filter((s) => s.category !== 'ai_tool')}
      />
    </main>
  );
}
