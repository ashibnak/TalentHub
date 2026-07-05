// AIGraph logo mark: a graph of connected nodes that reads as an "A" — indigo→violet.
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="11" fill="url(#aigraph-mark-grad)" />
      <g stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round">
        <line x1="20" y1="9" x2="10" y2="31" />
        <line x1="20" y1="9" x2="30" y2="31" />
        <line x1="14.5" y1="21" x2="25.5" y2="21" />
      </g>
      <g fill="#ffffff">
        <circle cx="20" cy="9" r="3" />
        <circle cx="10" cy="31" r="2.6" />
        <circle cx="30" cy="31" r="2.6" />
        <circle cx="14.5" cy="21" r="2.2" />
        <circle cx="25.5" cy="21" r="2.2" />
      </g>
      <defs>
        <linearGradient id="aigraph-mark-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4f46e5" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}
