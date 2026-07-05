import { ShieldCheck, ThumbsUp, Award, FolderKanban } from 'lucide-react';
import { Avatar } from '@/components/atoms/Avatar';
import { StatusPill } from '@/components/atoms/StatusPill';
import { ProjectCard } from '@/components/molecules/ProjectCard';
import { SkillTagList } from '@/components/molecules/SkillTagList';

const user = {
  name: 'سارا کریمی',
  role: 'مهندس یادگیری ماشین',
  status: 'building' as const,
  bio: 'پنج سال سابقه در توسعه مدل‌های NLP فارسی و سیستم‌های توصیه‌گر. علاقه‌مند به تقاطع هوش مصنوعی و تجربه کاربری. در حال ساختن ابزارهایی که یادگیری را برای ایرانیان ساده‌تر می‌کنند.',
  stats: [
    { label: 'پروژه', value: '۷', icon: FolderKanban },
    { label: 'مهارت تأیید شده', value: '۱۸', icon: ShieldCheck },
    { label: 'نشان', value: '۳', icon: Award },
    { label: 'رأی دریافتی', value: '۱۴۲', icon: ThumbsUp },
  ],
  skills: [
    { label: 'Python', verified: true },
    { label: 'PyTorch', verified: true },
    { label: 'Transformers', verified: true },
    { label: 'NLP', verified: true },
    { label: 'FastAPI', verified: false },
    { label: 'React', verified: false },
    { label: 'Claude API', verified: true },
    { label: 'Docker', verified: false },
    { label: 'PostgreSQL', verified: false },
    { label: 'Hugging Face', verified: true },
  ],
  projects: [
    {
      title: 'دستیار نوشتاری فارسی',
      description: 'ابزاری برای بهبود متون فارسی با استفاده از مدل‌های زبانی بزرگ',
      stage: 'building' as const,
      upvotes: 47,
    },
    {
      title: 'سیستم توصیه‌گر محتوا',
      description: 'موتور پیشنهاد محتوای شخصی‌سازی شده برای پلتفرم‌های آموزشی',
      stage: 'shipped' as const,
      upvotes: 83,
    },
  ],
};

export default function SaraKarimiProfile() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10">

        {/* ── Profile header ── */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={user.name} size={64} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-h2 leading-tight">{user.name}</h1>
              <StatusPill status={user.status} />
            </div>
            <p className="text-body text-info">{user.role}</p>
          </div>
          <button className="shrink-0 bg-transparent text-white border border-border hover:bg-info-subtle px-4 py-2 rounded-md text-body font-medium transition-colors">
            دنبال کن
          </button>
        </div>

        {/* ── Bio ── */}
        <p className="text-body-lg text-white/80 mb-6">{user.bio}</p>

        {/* ── Stats row ── */}
        <div className="border-t border-b border-border-subtle grid grid-cols-4 mb-8">
          {user.stats.map(({ label, value, icon: Icon }, i) => (
            <div
              key={label}
              className={`flex flex-col items-center py-4 gap-1 ${i > 0 ? 'border-s border-border-subtle' : ''}`}
            >
              <span className="text-h2 text-white">{value}</span>
              <div className="flex items-center gap-1 text-info">
                <Icon size={12} strokeWidth={1.5} />
                <span className="text-micro">{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Skills ── */}
        <section className="mb-8">
          <h2 className="text-h3 mb-3">مهارت‌ها</h2>
          <SkillTagList tags={user.skills} />
        </section>

        {/* ── Projects ── */}
        <section>
          <h2 className="text-h3 mb-3">پروژه‌ها</h2>
          <div className="grid grid-cols-2 gap-2">
            {user.projects.map((p) => (
              <ProjectCard key={p.title} {...p} />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
