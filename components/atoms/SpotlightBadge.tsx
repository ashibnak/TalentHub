// Spotlight badge (design system §5.4) — uppercase Latin only; the tracking/upper
// are applied here (not baked into the micro token) and never touch Persian (§7.3).
export function SpotlightBadge() {
  return (
    <span className="bg-action text-white text-micro font-medium uppercase tracking-wider px-2 py-0.5 rounded-sm">
      Spotlight
    </span>
  );
}
