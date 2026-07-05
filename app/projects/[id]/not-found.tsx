import Link from 'next/link';
import { FolderKanban } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="text-center">
        <FolderKanban className="text-info mx-auto mb-3" size={32} strokeWidth={1.5} />
        <h1 className="text-h2 mb-2">پروژه پیدا نشد</h1>
        <p className="text-body-sm text-text-muted mb-4">این پروژه وجود ندارد یا هنوز منتشر نشده است.</p>
        <Link
          href="/projects"
          className="inline-block bg-action hover:bg-action-hover text-on-action px-4 py-2 rounded-md text-body font-medium transition-colors"
        >
          همه‌ی پروژه‌ها
        </Link>
      </div>
    </div>
  );
}
