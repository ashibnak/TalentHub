import Link from 'next/link';
import { UserX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <UserX className="text-info mx-auto mb-3" size={40} strokeWidth={1.5} />
        <h1 className="text-h2 mb-1.5">کاربر پیدا نشد</h1>
        <p className="text-body-sm text-text-muted mb-4">این پروفایل وجود ندارد یا حذف شده است.</p>
        <Link
          href="/"
          className="inline-block bg-action hover:bg-action-hover text-white px-4 py-2 rounded-md text-body font-medium transition-colors"
        >
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
