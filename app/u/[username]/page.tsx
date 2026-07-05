import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ThumbsUp, Award, FolderKanban, Briefcase } from 'lucide-react';
import { Avatar } from '@/components/atoms/Avatar';
import { StatusPill } from '@/components/atoms/StatusPill';
import { RoleBadge } from '@/components/atoms/RoleBadge';
import { ProjectCard } from '@/components/molecules/ProjectCard';
import { ProfileSkills } from '@/components/molecules/ProfileSkills';
import { DomainExpertiseList } from '@/components/molecules/DomainExpertiseList';
import { EmptyState } from '@/components/atoms/EmptyState';
import { getProfileByUsername } from '@/lib/db/queries/users';
import { getOpportunitiesBySponsor } from '@/lib/db/queries/opportunities';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: 'کاربر پیدا نشد — AIGraph' };
  return { title: `${profile.name} — AIGraph`, description: profile.bio ?? undefined };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const isSponsor = profile.accountType === 'sponsor';
  const sponsorOpps = isSponsor ? await getOpportunitiesBySponsor(profile.id) : [];

  const stats = [
    { label: 'پروژه', value: profile.stats.projectCount, icon: FolderKanban },
    { label: 'مهارت تأیید شده', value: profile.stats.verifiedSkillCount, icon: ShieldCheck },
    { label: 'نشان', value: profile.stats.badgeCount, icon: Award },
    { label: 'رأی دریافتی', value: profile.stats.upvotesReceived, icon: ThumbsUp },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={profile.name} size={64} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-h2 leading-tight">{profile.name}</h1>
              {isSponsor ? (
                <span className="bg-fg text-white text-micro px-2 py-0.5 rounded-full">Sponsor</span>
              ) : (
                <>
                  <RoleBadge role={profile.roleBadge} />
                  <StatusPill status={profile.buildingStatus} />
                </>
              )}
            </div>
            {profile.roleTitle && <p className="text-body text-info">{profile.roleTitle}</p>}
          </div>
        </div>

        {/* ── Bio ── */}
        {profile.bio && <p className="text-body-lg text-fg/80 mb-6">{profile.bio}</p>}

        {/* ── Stats (talent only) ── */}
        {!isSponsor && (
          <div className="border-t border-b border-border-subtle grid grid-cols-4 mb-8">
            {stats.map(({ label, value, icon: Icon }, i) => (
              <div key={label} className={`flex flex-col items-center py-4 gap-1 ${i > 0 ? 'border-s border-border-subtle' : ''}`}>
                <span className="text-h2 text-fg">{toFaDigits(value)}</span>
                <div className="flex items-center gap-1 text-info">
                  <Icon size={14} strokeWidth={1.5} />
                  <span className="text-micro">{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Skills ── */}
        {profile.skills.length > 0 && (
          <section className="mb-8">
            <h2 className="text-h3 mb-3">مهارت‌ها</h2>
            <ProfileSkills skills={profile.skills} />
          </section>
        )}

        {/* ── Domain expertise ── */}
        {profile.domains.length > 0 && (
          <section className="mb-8">
            <h2 className="text-h3 mb-3">تخصص دامنه‌ای</h2>
            <DomainExpertiseList domains={profile.domains} />
          </section>
        )}

        {/* ── Opportunities (sponsor) or Projects (talent) ── */}
        {isSponsor ? (
          <section>
            <h2 className="text-h3 mb-3">فرصت‌های باز</h2>
            {sponsorOpps.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sponsorOpps.map((o) => (
                  <Link
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <span className="truncate text-body text-fg">{o.title}</span>
                    <span className="shrink-0 text-body-sm text-text-tertiary">{toFaDigits(o.applicantCount)} متقاضی</span>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon={Briefcase} title="فرصت بازی ندارد" />
            )}
          </section>
        ) : (
          <section>
            <h2 className="text-h3 mb-3">پروژه‌ها</h2>
            {profile.projects.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {profile.projects.map((p) => (
                  <ProjectCard key={p.id} title={p.title} description={p.description} stage={p.stage} upvotes={p.upvoteCount} />
                ))}
              </div>
            ) : (
              <EmptyState icon={FolderKanban} title="هنوز پروژه‌ای ثبت نشده" hint="این کاربر هنوز پروژه‌ای اضافه نکرده است" />
            )}
          </section>
        )}
      </div>
    </div>
  );
}
