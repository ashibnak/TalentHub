import type { Metadata } from 'next';
import { Geist, Vazirmatn } from 'next/font/google';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth/session';
import './globals.css';

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-vazirmatn',
  display: 'swap',
});

// Latin chips and badges (skill names, Builder, Spotlight). Persian body stays
// on Vazirmatn; Geist falls through to it for any Persian glyph in a chip.
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AIGraph',
  description: 'شبکه‌ی استعدادهای AI ایران',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${geist.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-fg antialiased">
        <Nav user={user ? { name: user.name, isAdmin: user.isAdmin } : null} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
