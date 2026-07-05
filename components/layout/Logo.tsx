import Link from 'next/link';

// Wordmark "AIGraph." — the vibrant indigo period is the visual hook (design system §1).
export function Logo() {
  return (
    <Link href="/" className="text-h3 font-bold tracking-tight text-fg">
      AIGraph<span className="text-action">.</span>
    </Link>
  );
}
