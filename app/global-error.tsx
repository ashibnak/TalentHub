'use client';

import { useEffect } from 'react';
import './globals.css';

// Last-resort boundary: fires when the ROOT layout itself throws, so it must
// render its own <html>/<body> (it replaces the layout). Kept minimal; imports
// globals.css so the design tokens still resolve.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app.global-error]', error.digest ?? error.message, error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-canvas font-sans text-fg antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-h2 mb-2">خطایی رخ داد</h1>
            <p className="text-body-sm text-text-muted mb-4">مشکلی جدی پیش آمد. صفحه را دوباره بارگذاری کن.</p>
            <button
              type="button"
              onClick={reset}
              className="inline-block bg-action hover:bg-action-hover text-on-action px-4 py-2 rounded-md text-body font-medium transition-colors"
            >
              تلاش دوباره
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
