// Geometric profile mark. Seeded by a stable id (username), so the same person
// always gets the same mark and two people almost never share one. Persian
// first letters collide too often to use as avatars; the name is already
// written beside the mark.
//
// Palette is the app's own: charcoal ground, teal / amber / emerald marks.
// No photos and no extra icon set.

const GROUNDS = ['#3a3939', '#333232', '#2c3a3a'];
const ACCENTS = ['#4cd1d6', '#ffab00', '#34d399'];

function hashSeed(seed: string) {
  let h = 2166136261;
  for (const ch of seed) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function point(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

export function Avatar({ seed, size = 40 }: { seed: string; size?: number }) {
  const h = hashSeed(seed || 'aigraph');
  const ground = GROUNDS[h % GROUNDS.length];
  const arc = ACCENTS[h % ACCENTS.length];
  const dot = ACCENTS[(h >>> 3) % ACCENTS.length];
  const start = h % 360;
  const sweep = 80 + ((h >>> 8) % 150);
  const [x1, y1] = point(20, 20, 12, start);
  const [x2, y2] = point(20, 20, 12, start + sweep);
  const [dx, dy] = point(20, 20, 12, start + 200);
  const dotR = 2.5 + ((h >>> 16) % 3);

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="shrink-0"
    >
      <circle cx="20" cy="20" r="20" fill={ground} />
      <path
        d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A 12 12 0 ${sweep > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
        fill="none"
        stroke={arc}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx={dx.toFixed(2)} cy={dy.toFixed(2)} r={dotR} fill={dot} />
    </svg>
  );
}
