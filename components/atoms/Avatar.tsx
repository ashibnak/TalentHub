// On-theme avatar palette (v3): dark monochrome + teal accent. All dark enough
// for white text (a bright accent bg would make white initials unreadable).
// Background is chosen from the name hash; text is always white.
const AVATAR_COLORS = ['#0a0a0a', '#1f1f1f', '#0f766e', '#3f3f46', '#134e4a', '#525252'];

function pickAvatarColorIndex(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % AVATAR_COLORS.length;
}

// A SINGLE monogram letter. Two-letter initials look broken for Persian names
// (adjacent letters render in wrong/isolated joining forms), so we use the first
// character of the name — clean in both Persian and Latin scripts.
function getInitials(name: string) {
  return [...name.trim()][0] ?? '';
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
        fontSize: size * 0.44,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
