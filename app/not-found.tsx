import Link from 'next/link';
import { Compass } from 'lucide-react';

// Root 404 — mirrors the per-route not-found style (icon + h2 + hint + action link).
export default function NotFound() {
  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="text-center">
        <Compass className="text-info mx-auto mb-3" size={32} strokeWidth={1.5} />
        <h1 className="text-h2 mb-2">صفحه پیدا نشد</h1>
        <p className="text-body-sm text-text-muted mb-4">این صفحه وجود ندارد یا جابه‌جا شده است.</p>
        <Link
          href="/"
          className="inline-block bg-action hover:bg-action-hover text-on-action px-4 py-2 rounded-md text-body font-medium transition-colors"
        >
          بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
