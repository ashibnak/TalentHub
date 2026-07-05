import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Github, ExternalLink, ThumbsUp } from 'lucide-react';
import { getProjectById } from '@/lib/db/queries/projects';
import { Avatar } from '@/components/atoms/Avatar';
import { SkillTag } from '@/components/atoms/SkillTag';
import { AiToolTag } from '@/components/atoms/AiToolTag';
import { StageBadge } from '@/components/atoms/StageBadge';
import { toFaDigits } from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);
  return { title: project ? `${project.title} — AIGraph` : 'پروژه پیدا نشد — AIGraph' };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h1 className="text-h1 leading-tight">{project.title}</h1>
        <StageBadge stage={project.stage} />
      </div>

      {/* owner */}
      <Link href={`/u/${project.owner.username}`} className="group inline-flex items-center gap-2 mb-6">
        <Avatar name={project.owner.name} size={32} />
        <span className="text-body text-fg group-hover:text-info transition-colors">{project.owner.name}</span>
        {project.owner.roleTitle && <span className="text-body-sm text-text-tertiary">· {project.owner.roleTitle}</span>}
      </Link>

      <p className="text-body-lg text-fg/80 leading-relaxed mb-6">{project.description}</p>

      {/* links + upvotes */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-transparent text-fg border border-border hover:bg-info-subtle px-4 py-2 rounded-md text-body font-medium transition-colors"
          >
            <Github size={16} strokeWidth={1.5} />
            GitHub
          </a>
        )}
        {project.demoUrl && (
          <a
            href={project.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-transparent text-fg border border-border hover:bg-info-subtle px-4 py-2 rounded-md text-body font-medium transition-colors"
          >
            <ExternalLink size={16} strokeWidth={1.5} />
            دمو
          </a>
        )}
        <span className="inline-flex items-center gap-1 text-info text-body">
          <ThumbsUp size={16} strokeWidth={1.5} />
          {toFaDigits(project.upvoteCount)}
        </span>
      </div>

      {project.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-h3 mb-3">مهارت‌ها</h2>
          <div className="flex flex-wrap gap-2">
            {project.skills.map((s) => (
              <SkillTag key={s.slug} label={s.name} />
            ))}
          </div>
        </section>
      )}

      {project.aiTools.length > 0 && (
        <section className="mb-6">
          <h2 className="text-h3 mb-3">ابزارهای AI</h2>
          <div className="flex flex-wrap gap-2">
            {project.aiTools.map((slug) => (
              <AiToolTag key={slug} slug={slug} />
            ))}
          </div>
        </section>
      )}

      {project.problems.length > 0 && (
        <section>
          <h2 className="text-h3 mb-3">مرتبط با چالش‌ها</h2>
          <div className="flex flex-col gap-2">
            {project.problems.map((p) => (
              <Link
                key={p.problemId}
                href={`/challenges/${p.challengeSlug}`}
                className="text-body text-info hover:text-fg transition-colors"
              >
                {p.challengeTitle} · {p.problemTitle}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
