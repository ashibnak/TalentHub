import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ShieldCheck, ThumbsUp, Award, FolderKanban } from 'lucide-react';
import { Avatar } from '@/components/atoms/Avatar';
import { StatusPill } from '@/components/atoms/StatusPill';
import { RoleBadge } from '@/components/atoms/RoleBadge';
import { ProjectCard } from '@/components/molecules/ProjectCard';
import { ProfileSkills } from '@/components/molecules/ProfileSkills';
import { DomainExpertiseList } from '@/components/molecules/DomainExpertiseList';
import { getProfileByUsername } from '@/lib/db/queries/users';
import { toFaDigits } from '@/lib/format';

// Reads Postgres per request — never prerendered at build.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: 'کاربر پیدا نشد — AIGraph' };
  return { title: `${profile.name} — AIGraph`, description: profile.bio ?? undefined };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const stats = [
    { label: 'پروژه', value: profile.stats.projectCount, icon: FolderKanban },
    { label: 'مهارت تأیید شده', value: profile.stats.verifiedSkillCount, icon: ShieldCheck },
    { label: 'نشان', value: profile.stats.badgeCount, icon: Award },
    { label: 'رأی دریافتی', value: profile.stats.upvotesReceived, icon: ThumbsUp },
  ];

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12">

        {/* ── Profile header ── */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={profile.name} size={64} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-h2 leading-tight">{profile.name}</h1>
              <RoleBadge role={profile.roleBadge} />
              <StatusPill status={profile.buildingStatus} />
            </div>
            {profile.roleTitle && <p className="text-body text-info">{profile.roleTitle}</p>}
          </div>
          <button className="shrink-0 bg-transparent text-white border border-border hover:bg-info-subtle px-4 py-2 rounded-md text-body font-medium transition-colors">
            دنبال کن
          </button>
        </div>

        {/* ── Bio ── */}
        {profile.bio && <p className="text-body-lg text-white/80 mb-6">{profile.bio}</p>}

        {/* ── Stats row ── */}
        <div className="border-t border-b border-border-subtle grid grid-cols-4 mb-8">
          {stats.map(({ label, value, icon: Icon }, i) => (
            <div
              key={label}
              className={`flex flex-col items-center py-4 gap-1 ${i > 0 ? 'border-s border-border-subtle' : ''}`}
            >
              <span className="text-h2 text-white">{toFaDigits(value)}</span>
              <div className="flex items-center gap-1 text-info">
                <Icon size={14} strokeWidth={1.5} />
                <span className="text-micro">{label}</span>
              </div>
            </div>
          ))}
        </div>

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

        {/* ── Projects ── */}
        <section>
          <h2 className="text-h3 mb-3">پروژه‌ها</h2>
          {profile.projects.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {profile.projects.map((p) => (
                <ProjectCard
                  key={p.id}
                  title={p.title}
                  description={p.description}
                  stage={p.stage}
                  upvotes={p.upvoteCount}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FolderKanban className="text-info mx-auto mb-3" size={32} strokeWidth={1.5} />
              <p className="text-body text-white mb-1.5">هنوز پروژه‌ای ثبت نشده</p>
              <p className="text-body-sm text-text-muted">این کاربر هنوز پروژه‌ای اضافه نکرده است</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
