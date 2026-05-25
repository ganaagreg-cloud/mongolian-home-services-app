---
name: production-ui-design
description: >
  Enforce production-grade UI/UX standards extracted from a real shadcn/ui + TailwindCSS v4
  mobile-first application. Use this skill whenever building ANY frontend component, screen,
  page, dashboard, form, card, list, modal, nav, or UI widget — even if the request seems
  simple. Covers exact Tailwind class tokens, spacing scale, radius, shadow ladder, color
  semantics, interactive states, typography hierarchy, and structural patterns. Prevents
  default-browser aesthetics, bad spacing, missing states, and amateur layouts.
  ALWAYS trigger for: "build a UI", "create a component", "design a screen/page/form/card",
  "make a table/modal/list/nav", "style this", or any React/HTML artifact request.
---

# Production UI Design — Source-Derived Standards

All rules in this skill are extracted directly from a production codebase.
They are not aspirational — they are the actual classes used in every component.

Reference files (load when needed):
- `references/patterns.md` — Copy-paste structural patterns by screen/component type
- `references/antipatterns.md` — Banned patterns with corrected alternatives

---

## Design Token System

### Color Palette (globals.css — light mode)
```
--primary:        #1E40AF   → blue-800  (active states, selections, links)
--accent:         #F97316   → orange-500 (CTAs, star fills, booking actions)
--success:        #16A34A   → green-600  (verified, completed, positive)
--destructive:    oklch(...)→ red (errors, SOS, delete, logout)
--card:           #F8FAFC   → slate-50  (all card/panel backgrounds)
--background:     #FFFFFF   → page background
--border:         #E5E7EB   → gray-200  (all borders and dividers)
--muted-foreground:#6B7280  → gray-500  (labels, metadata, placeholders)
--radius:         1rem      → 16px base (larger than shadcn default of 0.625rem)
```

**Dark mode equivalents exist** — always use semantic tokens, never raw hex or
`gray-*`/`slate-*` color classes on structural elements.

### TWO accent colors — this is intentional
- `primary` (blue): selection states, active tabs, focus rings, link text, icon tints
- `accent` (orange): book/CTA buttons, star ratings, promo highlights

### Semantic Tint Pattern (used everywhere)
```tsx
bg-primary/10 text-primary       // icon container, info badge
bg-success/10 text-success        // verified badge, escrow banner
bg-accent/10 text-accent          // filter button active, worker booking CTA
bg-destructive/10 text-destructive // warning row, dispute action
```

### Font
Always Geist: `font-sans` maps to `'Geist', 'Geist Fallback'`. Never Inter, Roboto, Arial.

---

## Border Radius — ALL `rounded-2xl`

The global `--radius: 1rem` makes everything more rounded than standard shadcn.

| Element                        | Class           |
|--------------------------------|-----------------|
| Cards, panels, banners         | `rounded-2xl`   |
| Primary buttons, inputs        | `rounded-2xl`   |
| Secondary buttons, date chips  | `rounded-2xl`   |
| Icon square containers         | `rounded-xl`    |
| Icon circular buttons          | `rounded-full`  |
| Filter chips, badges           | `rounded-full`  |
| OTP slots                      | `rounded-2xl`   |
| Table wrapper                  | `rounded-2xl`   |

**Never use `rounded-lg` or `rounded-xl` for cards/buttons/inputs.** The app uses
`rounded-2xl` as the standard card radius.

---

## Spacing Scale — Strict Rules

### Horizontal gutter: ALWAYS `px-6` (24px)
Every section, every heading, every card uses `px-6`. Never `px-4` or `px-8` for
content gutters. Full-width cards use `mx-6` instead of `px-6` on the wrapper.

### Vertical section spacing: ALWAYS `mt-6` between sections
```
pt-12     → top of page (accounts for safe-area / status bar)
mt-6      → between all major page sections
mt-4      → between related sub-elements (banner + section)
mt-3      → label → input, section heading → grid
mt-2      → tight adjacent elements
space-y-3 → card list items
space-y-4 → form fields
gap-3     → card grids (3-col categories), horizontal scroll items
gap-4     → avatar + content, admin KPI grid
```

### Bottom padding — based on page type
```
pb-24   → pages with fixed bottom nav bar
pb-32   → pages with fixed bottom CTA button
pb-8    → admin/desktop-style pages without fixed elements
```

---

## Height Scale — Fixed Component Heights

| Component                  | Height Class |
|---------------------------|--------------|
| Primary CTA buttons        | `h-14`       |
| Search inputs, phone input | `h-12`       |
| Icon circle buttons        | `h-10 w-10`  |
| Icon square containers     | `h-10 w-10`  |
| Filter chips / date picker | auto (py-3)  |
| Table header rows          | auto (py-3)  |
| List item rows             | auto (py-4)  |

---

## Shadow Ladder

```
shadow-sm   → default card/input/button rest state
shadow-md   → active selection state, elevated buttons, confirmed booking banner
shadow-lg   → gradient hero cards (wallet balance, promo banners)
```

Never use `shadow-xl` or `drop-shadow-*`. Shadows indicate elevation only.

Active selection adds shadow: `bg-primary text-primary-foreground shadow-md`
Inactive rests at: `bg-card text-foreground shadow-sm`

---

## Typography Hierarchy

```tsx
// Page H1 (mobile screen title)
<h1 className="text-xl font-bold text-foreground">

// Auth/onboarding H1 (centered, larger)
<h1 className="text-2xl font-bold text-foreground">

// Section heading (categories, workers list)
<h2 className="text-lg font-bold text-foreground">

// Card/form section label (date picker, address, payment)
<h2 className="font-semibold text-foreground">   // no text-size = text-base

// Card title / list item primary text
<p className="font-semibold text-foreground">

// Body / secondary info
<p className="text-sm text-muted-foreground">

// Price / highlighted value
<p className="text-sm font-semibold text-primary">

// Large stat number
<p className="text-2xl font-bold text-foreground">
<p className="text-3xl font-bold text-primary-foreground">  // on gradient card

// Meta / timestamp / caption
<p className="text-xs text-muted-foreground">

// Tiny badge label
<span className="text-[10px] font-medium text-success">
```

---

## Interactive States — Required on Every Element

### Touch/press feedback (mobile)
Every tappable element needs `active:scale-95`:
```tsx
className="... transition-all active:scale-95"
```

### Selection toggle (date chips, time slots, payment methods, filter chips)
```tsx
// Active
className="bg-primary text-primary-foreground shadow-md"
// Inactive
className="bg-card text-foreground shadow-sm"
```
Always use `transition-colors` on toggleable elements.

### Row hover
```tsx
className="transition-colors hover:bg-muted/50"
```

### Back/icon buttons
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors"
```

### CTA buttons
```tsx
// Primary (blue)
className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50"
// Accent/booking (orange)
className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md hover:bg-accent/90"
// Outline
className="h-14 w-full rounded-2xl border-border bg-card font-semibold shadow-sm hover:bg-card/80"
// Ghost destructive
className="h-14 w-full rounded-2xl text-destructive font-semibold hover:bg-destructive/10"
```

---

## Icon Usage Rules

All icons from `lucide-react`. Sizes:
- Inline with text, nav items: `h-5 w-5`
- Inside `h-10 w-10` container: `h-5 w-5`
- Inside card avatar fallback: `text-lg` (font-size, not SVG size)
- Star rating (accent fill): `h-3.5 w-3.5 fill-accent text-accent`
- Large feature icon (search empty state): `h-10 w-10 text-muted-foreground`

### Icon container (tinted square)
```tsx
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
  <Icon className="h-5 w-5 text-primary" />
</div>
```

### Notification badge on icon
```tsx
<span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
  2
</span>
```

---

## Card Structures

### Standard info card (`mx-6` + full internal padding)
```tsx
<div className="mx-6 rounded-2xl bg-card p-4 shadow-sm">
```

### Prominent card (wallet, gradient banner)
```tsx
<div className="mx-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg">
```

### Grouped menu list (profile items, settings — ONE card, dividers inside)
```tsx
<div className="mx-6 rounded-2xl bg-card shadow-sm overflow-hidden">
  {items.map((item, index) => (
    <button
      className={`flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${
        index !== items.length - 1 ? 'border-b border-border' : ''
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <item.icon className="h-5 w-5 text-primary" />
      </div>
      <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  ))}
</div>
```
**Never use individual cards per list item when items belong to the same group.**

### Worker / person card (avatar + details + action)
```tsx
<div className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm">
  <div className="flex items-start gap-3">
    <Avatar className="h-14 w-14 shrink-0">
      <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
        {name[0]}
      </AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate font-semibold text-foreground">{name}</p>
        {verified && (
          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
            ДАН
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{specialty}</p>
      <div className="mt-1 flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
        <span className="text-sm font-medium text-foreground">{rating}</span>
        <span className="text-sm text-muted-foreground">({reviews})</span>
        <span className="text-sm font-semibold text-primary">₮{price}/цаг</span>
      </div>
    </div>
  </div>
  <div className="mt-3">
    <Button className="h-11 w-full rounded-xl bg-accent ... hover:bg-accent/90">
      Захиалах
    </Button>
  </div>
</div>
```

---

## Page Shell Pattern

```tsx
// Standard page with bottom nav
<div className="flex min-h-screen flex-col bg-background pb-24">
  <div className="flex items-center justify-between px-6 pt-12">
    <div>
      <h1 className="text-xl font-bold text-foreground">Page Title</h1>
      <p className="text-sm text-muted-foreground">Subtitle</p>
    </div>
    {/* Right action, e.g. bell icon */}
  </div>
  {/* sections use mt-6 px-6 */}
</div>

// Page with back button header
<div className="flex items-center gap-4 px-6 pt-12">
  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm">
    <ArrowLeft className="h-5 w-5 text-foreground" />
  </button>
  <h1 className="text-xl font-bold text-foreground">Title</h1>
</div>
```

---

## Fixed Bottom CTA (sticky action button)

```tsx
{/* Add pb-32 to page wrapper when using this */}
<div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
  <Button
    disabled={!canSubmit}
    className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md disabled:opacity-50"
  >
    Confirm Action
  </Button>
</div>
```

---

## Horizontal Scroll (date picker, worker cards)

```tsx
<div className="flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
  {items.map(item => (
    <button
      className="min-w-[60px] rounded-2xl ..." // min-w prevents collapse
    >
    </button>
  ))}
</div>
```

---

## Price Summary Card

```tsx
<div className="mx-6 rounded-2xl bg-card p-4 shadow-sm">
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Subtotal (2h)</span>
    <span className="text-foreground">₮50,000</span>
  </div>
  <div className="mt-2 flex justify-between text-sm">
    <span className="text-muted-foreground">Platform fee (10%)</span>
    <span className="text-foreground">₮5,000</span>
  </div>
  <div className="mt-3 border-t border-border pt-3 flex justify-between">
    <span className="font-semibold text-foreground">Total</span>
    <span className="font-bold text-primary text-lg">₮55,000</span>
  </div>
</div>
```

---

## Loading State (skeleton rows)

```tsx
<div className="space-y-4">
  {[1, 2, 3].map(i => (
    <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-10 w-24 rounded-2xl" />
    </div>
  ))}
</div>
```

## Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16">
  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
    <Search className="h-10 w-10 text-muted-foreground" />
  </div>
  <p className="mt-4 text-lg font-semibold text-foreground">No results found</p>
  <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
</div>
```

---

## OR Divider (login screens)

```tsx
<div className="relative my-4">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border" />
  </div>
  <div className="relative flex justify-center">
    <span className="bg-background px-4 text-sm text-muted-foreground">or</span>
  </div>
</div>
```

---

## Progress / Status Timeline

```tsx
{steps.map((step, index) => {
  const done = index < currentStep
  const active = index === currentStep
  return (
    <div key={step.id} className="flex items-center gap-4">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
        done ? 'bg-success text-white' : active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <Check className="h-4 w-4" /> : <span className="text-sm font-bold">{index + 1}</span>}
      </div>
      <span className={`font-medium ${done || active ? 'text-foreground' : 'text-muted-foreground'}`}>
        {step.label}
      </span>
      {active && (
        <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Current
        </span>
      )}
    </div>
  )
})}
```

---

## Pre-Submit Checklist

Before returning any UI, verify every item is satisfied:

- [ ] **`rounded-2xl`** on all cards, buttons, inputs (not `rounded-lg` or `rounded-xl`)
- [ ] **`px-6`** horizontal gutter on all sections (not `px-4`)
- [ ] **`pt-12`** safe-area top padding on page headers
- [ ] **`mx-6`** on full-width card wrappers inside pages
- [ ] **`mt-6`** between every major page section
- [ ] **`pb-24`** on bottom-nav pages, `pb-32` on fixed-CTA pages
- [ ] **`h-14`** on primary CTAs, `h-12` on inputs, `h-10 w-10` on icon buttons
- [ ] **`shadow-sm`** on cards, **`shadow-md`** on active selections/elevated buttons
- [ ] **`active:scale-95`** on all tappable elements
- [ ] **`bg-primary/10 text-primary`** tint pattern for icon containers
- [ ] **`accent`** (orange) on booking/CTA buttons, `primary` (blue) for active states
- [ ] **Grouped list items** inside one `rounded-2xl bg-card overflow-hidden` with `border-b border-border` dividers
- [ ] **Lucide React** for all icons (no emoji, no Unicode, no inline SVG)
- [ ] **`text-muted-foreground`** on all metadata, labels, subtitles
- [ ] **`font-semibold text-foreground`** on all section sub-headings
- [ ] **Loading skeleton + empty state** present for any list/grid

Any unchecked item = revise before returning output.