# AIGraph Design System

**Version: v1.0** · phase 1 (dark mode, internal launch) — locked

## Changelog

- **v1.0** (current) — اولین نسخه‌ی کامل: palette نهایی (بدون cream)، typography scale (vibrant tech با Display 56)، dark mode فقط، component conventions کامل (button، input، badge، avatar، card، pill، spotlight)، layout patterns، Persian/RTL rules، Lucide icon system با stroke-width 1.5، anti-patterns list

> Reference document for all visual design decisions. Claude Code should read this before generating any UI component, page, or styling.
> Owner: Ashkan.

---

## Quick reference (read this first)

```
PRODUCT      AIGraph (domain: aigraph.ai)
STACK        Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
THEME        Dark mode only (light mode deferred to phase 2)
FONT         Vazirmatn (Persian + Latin in one family)
ICONS        Lucide React, stroke-width 1.5
TONE         Vibrant modern, editorial confidence, builder-positive
BG CANVAS    #001825   (deepest background)
SURFACE      #00314a   (cards, nav, modals)
ELEVATED     #0a3f5c   (hover, popover)
ACTION       #C01221   (primary CTA, spotlight, action energy)
ACTION HVR   #770201   (hover state for action)
INFO         #669bbc   (links, secondary text, success state)
TEXT         #FFFFFF   (primary text; never cream)
RADIUS       4 / 8 / 12 / 16 / full
SPACING      4-base: 4, 8, 12, 16, 24, 32, 48, 64
TYPE SCALE   56 / 36 / 24 / 18 / 16 / 14 / 13 / 11
```

When in doubt, prefer **fewer colors, smaller radii, less ornamentation**. The product is editorial-confident, not decorative.

---

## How to use this with Claude Code

Every prompt to Claude Code that produces UI must reference this file:

```
"Read /docs/DESIGN_SYSTEM.md before generating. Then [task]."
```

Most decisions are already made — Claude Code's job is to apply them, not re-invent. If a decision is genuinely missing from this doc, flag it in the response so a human can add it here rather than choose arbitrarily.

When `shadcn/ui` is installed, its defaults must be customized to match the tokens in section 2 of this doc — not used as-is.

---

## 1. Brand & tone

- **Name**: AIGraph
- **Domain**: aigraph.ai
- **Logotype**: word "AIGraph" with a vibrant-red period: `AIGraph.` The period is the visual hook. No separate icon mark in phase 1.
- **Tagline (Persian)**: شبکه‌ی استعدادهای AI ایران
- **Tone of voice**: confident, technical, builder-respecting. Never patronizing. Avoid corporate-HR speak. Speak to the developer/builder as a peer.

Examples of on-tone copy:
- "Submit your project" — not "Please submit your wonderful work"
- "۴ روز باقی مانده" — not "فقط چهار روز فرصت دارید!"
- "Currently building" — not "Active contributor"

---

## 2. Color tokens

### 2.1 Raw palette

| Hex | Role |
|---|---|
| `#00314a` | Brand primary (navy) |
| `#001825` | Canvas (derived darker) |
| `#0a3f5c` | Elevated surface (derived lighter) |
| `#669bbc` | Brand secondary (sky blue) |
| `#770201` | Action hover / critical depth (wine) |
| `#C01221` | Action accent (vibrant red) |
| `#FFFFFF` | Text & spotlight surface |

There is **no cream** (`#FEF1D5` was considered and rejected — pure white is the surface color). There is **no green or yellow**. Success states use sky blue. Resist the urge to introduce a green.

### 2.2 Semantic tokens (dark mode)

Use these in code, not raw hex values.

```css
:root {
  /* Backgrounds */
  --bg-canvas: #001825;
  --bg-surface: #00314a;
  --bg-surface-elevated: #0a3f5c;
  --bg-info-subtle: rgba(102, 155, 188, 0.12);
  --bg-info-muted: rgba(102, 155, 188, 0.18);
  --bg-action: #C01221;
  --bg-action-hover: #770201;
  --bg-action-subtle: rgba(192, 18, 33, 0.08);
  --bg-spotlight: #FFFFFF;
  --bg-disabled: rgba(102, 155, 188, 0.03);

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #669bbc;
  --text-tertiary: rgba(255, 255, 255, 0.6);
  --text-muted: rgba(255, 255, 255, 0.5);
  --text-disabled: rgba(255, 255, 255, 0.4);
  --text-on-action: #FFFFFF;
  --text-on-spotlight: #00314a;
  --text-link: #669bbc;
  --text-link-hover: #FFFFFF;

  /* Borders */
  --border-subtle: rgba(102, 155, 188, 0.18);
  --border-default: rgba(102, 155, 188, 0.35);
  --border-focus: #669bbc;
  --border-action: #C01221;
  --border-error: #C01221;

  /* States */
  --state-error: #C01221;
  --state-success: #669bbc;
  --state-info: #669bbc;
}
```

### 2.3 Tailwind theme extension

Add to `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class', // app uses class="dark" on <html> by default
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
        },
        action: {
          DEFAULT: 'var(--bg-action)',
          hover: 'var(--bg-action-hover)',
          subtle: 'var(--bg-action-subtle)',
        },
        info: {
          DEFAULT: '#669bbc',
          subtle: 'rgba(102, 155, 188, 0.12)',
          muted: 'rgba(102, 155, 188, 0.18)',
        },
        spotlight: 'var(--bg-spotlight)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          focus: 'var(--border-focus)',
        },
      },
    },
  },
} satisfies Config;
```

Then in code: `bg-canvas`, `text-text-secondary`, `border-border-subtle`, etc.

---

## 3. Typography

### 3.1 Font setup

Load Vazirmatn variable font (covers Latin + Persian glyphs). Use Google Fonts or self-host.

```tsx
// app/layout.tsx
import { Vazirmatn } from 'next/font/google';

const vazirmatn = Vazirmatn({
  subsets: ['latin', 'arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
});
```

Tailwind:
```ts
fontFamily: {
  sans: ['var(--font-vazirmatn)', 'system-ui', 'sans-serif'],
}
```

### 3.2 Scale

| Token | Size / Line / Weight | Use |
|---|---|---|
| `display` | 56 / 1.05 / 700 | Hero h1 on landing, sign-in logotype |
| `h1` | 36 / 1.15 / 700 | Page title |
| `h2` | 24 / 1.3 / 600 | Section heading |
| `h3` | 18 / 1.4 / 600 | Card title, subsection |
| `body-lg` | 16 / 1.6 / 400 | Long-form paragraph |
| `body` | 14 / 1.5 / 400 | Default UI body, form labels, table cell |
| `body-sm` | 13 / 1.5 / 400 | Metadata, helper text |
| `micro` | 11 / 1.4 / 500 + uppercase + letter-spacing 0.08em | Section labels, badges, timestamps |

Tailwind extension:
```ts
fontSize: {
  display: ['3.5rem', { lineHeight: '1.05', fontWeight: '700', letterSpacing: '-0.02em' }],
  h1: ['2.25rem', { lineHeight: '1.15', fontWeight: '700' }],
  h2: ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
  h3: ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
  'body-lg': ['1rem', { lineHeight: '1.6' }],
  body: ['0.875rem', { lineHeight: '1.5' }],
  'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
  micro: ['0.6875rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.08em' }],
}
```

Use: `<h1 className="text-h1">Page title</h1>`

### 3.3 Persian-specific rules

- **Never uppercase Persian text.** `text-transform: uppercase` only applies to Latin micro labels.
- Persian text typically needs `line-height` slightly larger than Latin equivalent (already baked into `body-lg` at 1.6).
- Numbers: use Persian numerals (`۱۲۳`) only in pure-Persian sentences. Mixed sentences and metadata use Western (`123`).
- Punctuation: Persian uses `،` (Persian comma) not `,`. Period stays the same (`.`).

---

## 4. Spacing & radius

### 4.1 Spacing

4px base. Use these values only:

```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
```

Maps directly to Tailwind: `p-1`, `p-2`, `p-3`, `p-4`, `p-6`, `p-8`, `p-12`, `p-16`.

Common patterns:
- Card padding: `p-4` (16px) for compact, `p-6` (24px) for primary
- Section gap: `gap-6` to `gap-8`
- Form field gap: `gap-3` (12px)
- Inline element gap: `gap-2` (8px)

### 4.2 Border radius

```
sm  4px   tags, chips, micro badges
md  8px   buttons, inputs, small cards
lg  12px  cards, modals, dropdowns
xl  16px  hero cards, spotlight banner
full      avatars, status pills
```

Tailwind: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-full`. Never invent in-between values.

---

## 5. Component conventions

For every component below: shadcn/ui's default version must be modified to match these conventions before use.

### 5.1 Button

Three variants. No more. No "destructive" variant — primary handles all critical actions; modal confirmation handles risk.

```tsx
// Primary — for main CTA, only one per screen ideally
<button className="bg-action hover:bg-action-hover text-white px-4 py-2.5 rounded-md text-body font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
  Submit project
</button>

// Secondary — alternative actions, can have multiple
<button className="bg-transparent text-white border border-border hover:bg-info-subtle px-4 py-2.5 rounded-md text-body font-medium transition-colors">
  View challenge
</button>

// Ghost — tertiary actions, low-emphasis
<button className="bg-transparent text-info hover:text-white px-3 py-2.5 rounded-md text-body font-medium transition-colors">
  Cancel
</button>
```

Sizes:
- `sm`: `px-3 py-1.5 text-body-sm`
- `md` (default): `px-4 py-2.5 text-body`
- `lg`: `px-6 py-3.5 text-body-lg`

States: `default / hover / active (transform scale-[0.98]) / disabled (opacity-40) / loading (opacity-90 with spinner)`.

### 5.2 Input / textarea / select

Consistent treatment across all three:

```tsx
<input
  type="text"
  className="w-full bg-info-subtle border border-border-subtle focus:border-border-focus focus:bg-info-muted rounded-md px-3 py-2.5 text-body text-white placeholder:text-text-muted outline-none transition-colors"
/>
```

Error state: add `border-border-error bg-action-subtle`, plus helper text below in `text-state-error text-body-sm`.

Disabled: add `opacity-40 cursor-not-allowed bg-disabled`.

Label above field in `text-body-sm text-text-tertiary mb-1.5`. Helper text below in `text-body-sm text-text-muted mt-1`.

### 5.3 Checkbox & toggle

```tsx
// Checkbox — used for legally meaningful actions (IP confirmation, terms)
<label className="flex items-center gap-2 cursor-pointer">
  <span className="w-[18px] h-[18px] rounded-sm bg-action flex items-center justify-center">
    <Check size={12} className="text-white" />
  </span>
  <span className="text-body text-white">این پروژه proprietary نیست</span>
</label>

// Toggle — used for binary user preferences
// Width 32 / height 18 / thumb 14 — never larger
```

### 5.4 Badge & tag

Three categories that look distinct:

```tsx
// Skill tag — most common, neutral
<span className="bg-info-muted text-white text-micro px-2 py-0.5 rounded-sm">React</span>

// Verified skill tag — has shield icon
<span className="bg-info-muted text-white text-micro px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
  <ShieldCheck size={11} className="text-info" />
  Python
</span>

// AI tool tag — has check-circle icon (different from shield)
<span className="bg-info-muted text-white text-micro px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
  <CircleCheck size={11} className="text-info" />
  Claude Code
</span>
```

**Project stage badges** — use opacity ladder + icon, not different colors:

```tsx
// Experiment — subtle, low energy
<span className="bg-white/8 text-white/70 text-micro px-2.5 py-1 rounded-sm inline-flex items-center gap-1">
  <FlaskConical size={14} /> Experiment
</span>

// Weekend Hack — subtle blue
<span className="bg-info-muted text-white text-micro px-2.5 py-1 rounded-sm inline-flex items-center gap-1">
  <Zap size={14} /> Weekend Hack
</span>

// Building — full blue (most active)
<span className="bg-info text-surface text-micro px-2.5 py-1 rounded-sm inline-flex items-center gap-1">
  <Wrench size={14} /> Building
</span>

// Shipped — action red (achievement)
<span className="bg-action text-white text-micro px-2.5 py-1 rounded-sm inline-flex items-center gap-1">
  <Rocket size={14} /> Shipped
</span>

// Maintained — outline only (timeless)
<span className="border border-white/40 text-white text-micro px-2.5 py-1 rounded-sm inline-flex items-center gap-1">
  <ShieldCheck size={14} /> Maintained
</span>
```

**Special badges**:

```tsx
// Spotlight — uppercase, all-caps Latin only, never on Persian
<span className="bg-action text-white text-[11px] tracking-wider uppercase px-2.5 py-1 rounded-sm font-medium">
  Spotlight
</span>

// AI Verified — for skill verification confirmation
<span className="bg-info-muted text-white text-micro px-2 py-0.5 rounded-sm inline-flex items-center gap-1">
  <ShieldCheck size={14} className="text-info" /> AI Verified
</span>
```

### 5.5 Avatar

Auto-generated with initials. Background color picked from 4-color rotation based on name hash.

```tsx
const avatarColors = ['#00314a', '#669bbc', '#C01221', '#770201'];
const textColors = ['#FFFFFF', '#00314a', '#FFFFFF', '#FFFFFF'];

function pickAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % avatarColors.length;
}
```

Sizes:
- `xs` 24px (inline mentions, dense lists)
- `sm` 32px (cards, comment author)
- `md` 40px (default profile cards)
- `lg` 56px (profile page header)
- `xl` 80px (only for own-profile-edit page)

Always `rounded-full`. Always initials in `font-semibold`. Font size: ~40% of avatar size.

### 5.6 Card

Standard surface for grouping content:

```tsx
<div className="bg-surface border border-border-subtle rounded-lg p-4 hover:bg-surface-elevated transition-colors">
  {/* content */}
</div>
```

For cards inside cards (rare, avoid if possible): inner cards drop the border, use `bg-canvas` instead of surface to differentiate.

Cards in a grid: `grid grid-cols-2 gap-2.5` for compact, `gap-4` for primary directory grids.

### 5.7 Status pill (`building_status`)

```tsx
// Currently building — active state
<span className="inline-flex items-center gap-1.5 bg-info-muted text-info text-micro px-2.5 py-1 rounded-full">
  <span className="w-1.5 h-1.5 bg-info rounded-full" />
  Currently building
</span>

// Shipped — completed state
<span className="inline-flex items-center gap-1.5 bg-white/10 text-white text-micro px-2.5 py-1 rounded-full">
  <span className="w-1.5 h-1.5 bg-white rounded-full" />
  Shipped
</span>

// Idle — inactive state
<span className="inline-flex items-center gap-1.5 bg-white/5 text-text-muted text-micro px-2.5 py-1 rounded-full">
  <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
  Idle
</span>
```

### 5.8 Spotlight banner

The only place white surface is used. Inverted color scheme — navy text on white background. High contrast intentional.

```tsx
<div className="bg-spotlight rounded-xl p-5">
  <div className="flex items-center gap-2 mb-1.5">
    <span className="bg-action text-white text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-sm font-medium">Spotlight</span>
    <span className="text-body-sm text-surface/70">۴ روز باقی مانده</span>
  </div>
  <h3 className="text-h2 text-surface mb-1.5">Performance review summarizer</h3>
  <p className="text-body-sm text-surface/75">HR Challenge · description here</p>
</div>
```

Only ONE spotlight banner active on any page at a time. Don't ever stack multiple. If multiple things need attention, the spotlight feature isn't the right tool — use a regular card with an action accent.

---

## 6. Layout patterns

### 6.1 Page chrome

Every authenticated page has a top nav bar at the same height. No side nav in phase 1.

```tsx
<nav className="bg-surface border-b border-border-subtle px-4 py-2.5 flex items-center gap-6">
  <Logo /> {/* AIGraph. with red period */}
  <div className="flex gap-4 flex-1">
    <NavLink href="/people">People</NavLink>
    <NavLink href="/projects">Projects</NavLink>
    <NavLink href="/challenges">Challenges</NavLink>
    <NavLink href="/leaderboard">Leaderboard</NavLink>
  </div>
  <SearchTrigger />
  <NotificationsBell />
  <UserAvatar />
</nav>
```

Active route: `text-white font-medium`. Inactive: `text-text-tertiary`.

Notifications bell: shows a small red dot when unread items exist. Never a counter number.

### 6.2 Empty states

Every list view must have an empty state. Pattern:

```tsx
<div className="text-center py-16">
  <Icon className="text-info mx-auto mb-3" size={32} />
  <p className="text-body text-white mb-1.5">هنوز هیچ پروژه‌ای ثبت نشده</p>
  <p className="text-body-sm text-text-muted mb-4">اولین پروژه‌ت رو اضافه کن و شروع کن به ساختن</p>
  <Button variant="primary">Add your first project</Button>
</div>
```

Empty state copy in Persian is friendlier and more inviting than English. Tone: invitational, not apologetic.

### 6.3 Loading states

Always show skeleton cards matching the actual content layout, not generic spinners. Spinner only for in-flight button states (Submit button after click).

Skeleton color: `bg-white/5` with subtle pulse animation.

```tsx
<div className="animate-pulse">
  <div className="bg-white/5 h-4 w-24 rounded mb-2" />
  <div className="bg-white/5 h-3 w-full rounded" />
</div>
```

### 6.4 Toast notifications

Bottom-right of screen. Auto-dismiss after 4 seconds. Three variants:

- Success: `bg-info-subtle border-info` text-info
- Error: `bg-action-subtle border-action text-white`
- Info: `bg-surface border-border-subtle text-white`

Never use toast for critical user-action confirmations (use modal instead).

---

## 7. Persian & RTL

### 7.1 Direction

App is **bidirectional by default**. Set `dir="rtl"` on `<html>` when user's primary language is Persian (default for AIGraph).

Tailwind RTL behavior: use logical properties when possible (`ps-*` instead of `pl-*`, `me-*` instead of `mr-*`) so layouts flip cleanly.

### 7.2 Mixing scripts

Persian and Latin will mix constantly (e.g., "Cursor با Claude Code"). Vazirmatn handles this gracefully. Don't try to separate scripts into different spans — let the font handle it.

### 7.3 Things that don't work in Persian

- **No uppercase Persian.** `uppercase` class applies only to Latin micro labels (like "SPOTLIGHT" or "BUILD STATUS").
- **No letter-spacing on Persian.** Persian script is connected; letter-spacing breaks it. Apply `tracking-wide` etc. only on Latin elements.
- **No italics on Persian.** Italic Persian is not a real style. Don't apply `italic` to Persian text.

### 7.4 Numbers

```tsx
// Pure Persian context
<span>۲۴۸۷ کاربر</span>

// Mixed / data / metadata context
<span>2,487 users</span>
<span>updated 2 days ago</span>
```

Don't mechanically convert all numbers. Match the surrounding language.

---

## 8. Iconography

### 8.1 Library

**Lucide React** is the only icon library. Don't import from anywhere else.

```tsx
import { ShieldCheck, Rocket, Wrench, FlaskConical, Zap } from 'lucide-react';
```

### 8.2 Sizes

| Token | px | Use |
|---|---|---|
| xs | 11 | Inside tags, micro contexts |
| sm | 14 | Inside badges, inline with body text |
| md | 16 | Default |
| lg | 20 | Standalone in cards, nav |
| xl | 24 | Empty states, hero contexts |

```tsx
<Icon size={14} className="text-info" />
```

### 8.3 Stroke

```tsx
<Icon strokeWidth={1.5} />
```

Default Lucide is 2 — too heavy for the editorial palette. Always use 1.5.

### 8.4 Icon-only buttons

Always include `aria-label`:

```tsx
<button className="p-2 rounded-md hover:bg-info-subtle" aria-label="Search">
  <Search size={18} className="text-text-tertiary" />
</button>
```

---

## 9. Anti-patterns

Things that look like they might work but break the system:

1. **Don't introduce greens, ambers, or other hues** for new states. The palette is intentionally constrained. Success uses sky blue. If you genuinely need a new color, raise it for review — don't add inline.
2. **Don't use cream (`#FEF1D5`)** anywhere. It was in the original palette and was removed. White is the only light surface.
3. **Don't use gradients, drop shadows, or blur effects.** The palette has enough contrast on its own. Shadow effects on dark backgrounds rarely look good.
4. **Don't stack two CTAs of equal weight.** One primary, then secondary. Never two primaries side by side.
5. **Don't use letter-spacing or uppercase on Persian text.** See section 7.3.
6. **Don't put avatars on dark navy without color rotation** — they all look the same. Use the 4-color hash rotation.
7. **Don't invent intermediate radius or spacing values.** Stick to the scale.
8. **Don't use emoji as icons.** Use Lucide.
9. **Don't show notification counters** — only dot indicators. Counters are an engagement trap.
10. **Don't put `shadcn` defaults straight into the app** — customize first.

---

## 10. File & folder conventions

```
/components/ui/         shadcn/ui primitives (button, input, card, etc.) — customized per this doc
/components/atoms/      project-specific atoms not in shadcn (StatusPill, StageBadge, VerifiedTag)
/components/molecules/  composite components (UserCard, ProjectCard, ChallengeCard, ProblemCard)
/components/layout/     Nav, Footer, PageHeader
/app/                   Next.js routes
/styles/globals.css     CSS variables + base resets
```

---

## 11. Updates to this document

When a new design decision is made:
1. Update this file first
2. Commit with message: `docs: design system update — <what changed>`
3. Then implement

Never let a design decision live only in code and not in this doc. If it's not here, it's not real.

---

**End of design system v1.** Phase 2 additions (light mode, multi-tenancy theming, mobile-specific patterns) will live in a separate `DESIGN_SYSTEM_V2.md` to keep this one stable.
