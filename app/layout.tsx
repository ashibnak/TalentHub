import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'AIGraph',
  description: 'شبکه‌ی استعدادهای AI ایران',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-canvas font-sans text-fg antialiased">
        <Nav user={user ? { name: user.name, isAdmin: user.isAdmin } : null} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
