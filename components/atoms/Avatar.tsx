// On-theme avatar palette (v4 dark): mid-dark grays + deep teal, all a step
// lighter than the charcoal surfaces so avatars read on cards, and all dark
// enough for white text. Background from the name hash; text always white.
const AVATAR_COLORS = ['#3f3f46', '#52525b', '#0f766e', '#4a4a4a', '#134e4a', '#5f5f66'];

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
