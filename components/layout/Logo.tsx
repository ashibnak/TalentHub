import Link from 'next/link';
import { LogoMark } from './LogoMark';

// Logo lockup: the graph mark + "AIGraph." wordmark with the indigo period hook.
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-h3 font-bold tracking-tight text-fg">
      <LogoMark size={26} />
      <span>
        AIGraph<span className="text-action">.</span>
      </span>
    </Link>
  );
}
