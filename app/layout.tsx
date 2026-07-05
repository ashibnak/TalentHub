import type { Metadata } from 'next';
import { Vazirmatn } from 'next/font/google';
import { Nav } from '@/components/layout/Nav';
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className="min-h-screen bg-canvas font-sans text-fg antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
