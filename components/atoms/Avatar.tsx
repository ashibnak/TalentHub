// Modern, vibrant avatar palette (v2). Background picked from the name hash;
// text is always white on these saturated colors.
const AVATAR_COLORS = ['#4f46e5', '#059669', '#0ea5e9', '#db2777', '#d97706', '#7c3aed'];

function pickAvatarColorIndex(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % AVATAR_COLORS.length;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const idx = pickAvatarColorIndex(name);
  return (
    // Decorative: the user's name is always shown as adjacent text (h1 / card
    // label), so the initials are hidden from assistive tech to avoid double-reading.
    <div
      aria-hidden="true"
      className="rounded-full flex items-center justify-center font-semibold shrink-0 text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: AVATAR_COLORS[idx],
        fontSize: size * 0.4,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
