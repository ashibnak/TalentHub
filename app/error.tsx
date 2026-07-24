'use client';

import { useEffect } from 'react';
import { TriangleAlert, RotateCcw } from 'lucide-react';

// Route-segment error boundary (renders inside the root layout — nav/footer stay).
// Tokens only, no new colors (the icon uses the info/sky token, per §9).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app.error]', error.digest ?? error.message, error);
  }, [error]);

  return (
    <div className="flex items-center justify-center px-4 py-16">
      <div className="text-center">
        <TriangleAlert className="text-info mx-auto mb-3" size={32} strokeWidth={1.5} />
        <h1 className="text-h2 mb-2">خطایی رخ داد</h1>
        <p className="text-body-sm text-text-muted mb-4">مشکلی پیش آمد. می‌توانی دوباره تلاش کنی.</p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 bg-action hover:bg-action-hover text-on-action px-4 py-2 rounded-md text-body font-medium transition-colors"
        >
          <RotateCcw size={16} strokeWidth={1.5} />
          تلاش دوباره
        </button>
      </div>
    </div>
  );
}
