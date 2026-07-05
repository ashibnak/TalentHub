import { LogoMark } from './LogoMark';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-subtle">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-body font-bold text-fg">
            AIGraph<span className="text-action">.</span>
          </span>
        </div>
        <p className="text-body-sm text-text-muted">شبکه‌ی استعدادهای AI ایران · فاز ۱</p>
      </div>
    </footer>
  );
}
