// AIGraph mark (v3): a black squircle with a white node graph and one electric
// accent hub — monochrome with a single fantastic accent.
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
      <rect width="40" height="40" rx="11" fill="#0a0a0a" />
      <g stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round">
        <line x1="20" y1="20" x2="20" y2="9" />
        <line x1="20" y1="20" x2="10.5" y2="29" />
        <line x1="20" y1="20" x2="29.5" y2="29" />
      </g>
      <g fill="#ffffff">
        <circle cx="20" cy="9" r="2.6" />
        <circle cx="10.5" cy="29" r="2.6" />
        <circle cx="29.5" cy="29" r="2.6" />
      </g>
      <circle cx="20" cy="20" r="3.7" fill="#6366f1" />
    </svg>
  );
}
