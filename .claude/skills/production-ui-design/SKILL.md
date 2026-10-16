---
description: Use when writing or editing any React component or screen — especially anything under components/screens/, components/*.tsx, or any TSX file. Triggered by tasks involving UI, layouts, buttons, cards, forms, navigation, icons, or visual design.
---

# Production UI Design System (v2 — teal + saffron)

Source of truth for tokens: `packages/web/app/globals.css`. Reference mockups: the
"Нэгдсэн дизайн" page of the HomeService Design Directions canvas.

## Brand & color tokens

```
--background        #F3F5F2  warm off-white page ground
--card              #FFFFFF  every card, input, sheet, nav pill
--foreground        #0F172A  ink
--muted-foreground  #5B6475  labels, metadata (passes 4.5:1 on white and ground)
--primary           #0B7A6A  brand teal — ALL CTAs, active tab, selection, links
--primary-strong    #075E52  text on white buttons placed on teal
--primary-soft      #E2F3EF  brand tint (same as bg-primary/10 on white)
--highlight         #F2A93B  saffron — stars, count badges, the logo's toono. Never a large surface
--highlight-strong  #8A5A08  saffron for TEXT (warning/“on the way” labels) — readable
--highlight-soft    #FDF1DC  saffron tint background
--highlight-on-primary #FEEDCC  saffron-cream for small text on teal surfaces (eyebrows)
--accent            #ECEFEA  shadcn hover/focus surface ONLY (do not use as a brand color)
--destructive       #DC2626  errors, SOS, cancel
--success           #0E8A5C  completed/verified states
--border            #E3E7E1
```

Rules:
- One action color: `bg-primary text-primary-foreground`. Booking CTAs are teal, not saffron.
- Saffron text is always `text-highlight-strong`. `text-highlight` only on icons (stars: `fill-highlight text-highlight`).
- Never use `accent` for brand meaning — it is the shadcn neutral hover surface.
- Semantic tints: `bg-primary/10 text-primary`, `bg-highlight/10 text-highlight-strong`, `bg-success/10 text-success`, `bg-destructive/10 text-destructive`.

### Service tones (category identity)
Use `serviceTone(icon)` / `serviceIcon(icon)` from `lib/service-tone.ts` for anything that shows a
service. Tones: rose, sky, blue, amber, violet, teal → classes `bg-tone-<x>-soft` + `text-tone-<x>`.
People avatars: `personTone(name)` so a worker keeps the same tint everywhere.
Never use tone colors for buttons or selection.

## Typography
Font: **Manrope** via `next/font` (`--font-manrope`, includes cyrillic-ext for Ө/Ү). Never Geist/Inter/Arial.

```
Page greeting / hero h1   text-[26px] font-extrabold leading-tight tracking-tight
Auth headline             text-[34px] font-extrabold leading-[1.1] tracking-tight
Page title                text-xl font-bold
Section heading           text-lg font-extrabold tracking-tight
Card title                text-[15px] font-extrabold
Secondary                 text-sm / text-[13px] text-muted-foreground
Eyebrow label             text-[11px] font-extrabold uppercase tracking-[0.12em]
Money                     font-extrabold tabular-nums (always ₮ + toLocaleString())
```
Names in headings: wrap in `whitespace-nowrap` so hyphenated names (Бат-Эрдэнэ) never split.

## Shape
| Element | Class |
|---|---|
| Hero / prominent cards | `rounded-3xl` (24px) |
| Standard cards, list groups | `rounded-2xl` or `rounded-[22px]` |
| Buttons, inputs | `rounded-2xl` |
| Service tiles | `h-16 w-16 rounded-[22px]` |
| Icon squares | `rounded-xl` / `rounded-[14px]` |
| Icon buttons, chips, badges, toggles | `rounded-full` |

## Elevation (custom shadows in globals.css)
```
shadow-card   resting cards, inputs, icon buttons (soft, layered)
shadow-float  floating UI: tab bar, sheets, SOS pill
shadow-brand  teal CTAs and teal hero cards (teal-tinted glow)
```
Do not use `shadow-sm/md/lg/xl` or `drop-shadow-*` in new code.

## Motion
- Every tappable element: `pressable` (eased scale 0.97 on press). Do not add `active:scale-95` / `transition-all`.
- Page sections enter with `stagger-item` + `style={{ '--i': n } as CSSProperties}` (60ms steps).
- Small appearances: tw-animate-css (`animate-in fade-in slide-in-from-bottom-2 duration-300`).
- Live status dots: `animate-pulse`. Reduced motion is honored globally — don't override it.

## Navigation & layout
- Tab bars are `FloatingTabBar` (floating white pill, active tab = teal pill with label).
  They render ONLY on tab roots (`/home`, `/orders`, `/profile`, worker tabs). Every other screen
  MUST have a back button (`h-10 w-10 rounded-full bg-card shadow-card pressable` + `ArrowLeft`).
- Fixed bottom CTAs sit at `bottom-0` with `pb-[max(env(safe-area-inset-bottom),24px)]`; page gets `pb-32`.
- Pages with the tab bar use `pb-28`. Horizontal gutter `px-5`/`px-6`, top `pt-12`.
- `ModeToggle` is inline in the header of `/home` and `/jobs` — never floating.
- SOS on the customer active-order screen is the top-right pill (`placement="top"`).

## Icons & brand mark
- Icons: `lucide-react` only, `h-5 w-5` inline. Verified badge: `BadgeCheck` `fill-primary text-primary-foreground`.
- The logo is `BrandMark` / `GerGlyph` (`components/brand-mark.tsx`) — the only inline SVG allowed.
- No emoji in UI.

## Patterns

### Card
```tsx
<div className="rounded-[22px] bg-card p-4 shadow-card">…</div>
```

### Teal hero card
```tsx
<div className="rounded-3xl bg-primary p-[18px] text-primary-foreground shadow-brand">
  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-highlight-on-primary">Eyebrow</p>
  …
  <Link className="pressable inline-flex h-11 items-center gap-2 rounded-[14px] bg-card px-4 text-sm font-extrabold text-primary-strong">…</Link>
</div>
```

### Primary CTA
```tsx
<Button className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-brand hover:bg-primary/90 pressable disabled:opacity-50">
```

### Service tile
```tsx
const Icon = serviceIcon(s.icon); const tone = serviceTone(s.icon)
<Link className="pressable flex flex-col items-center gap-2">
  <span className={cn('flex h-16 w-16 items-center justify-center rounded-[22px]', tone.tile)}>
    <Icon className={cn('h-[26px] w-[26px]', tone.icon)} strokeWidth={1.9} />
  </span>
  <span className="text-center text-xs font-bold leading-tight">{s.name_mn}</span>
</Link>
```

### Grouped list
One `rounded-2xl bg-card shadow-card overflow-hidden` container with `border-b border-border` rows.
Never one card per row of the same group.

### Loading & empty
Every list/grid has a `Skeleton` state shaped like the real content and an empty state
(icon in a `h-24 w-24 rounded-full bg-card` circle + title + one-line hint + an action when one exists).

## Pre-submit checklist
- [ ] Teal for every action; saffron only for stars/badges/eyebrows; saffron text uses `-strong`
- [ ] White cards on the warm ground with `shadow-card`; CTAs `shadow-brand`
- [ ] `pressable` on tappables; sections use `stagger-item`
- [ ] Service visuals via `serviceTone`/`serviceIcon`; people via `personTone`
- [ ] No tab bar on drill-down screens; back button present; fixed CTA at `bottom-0`
- [ ] Money `₮` + `tabular-nums`; names `whitespace-nowrap`
- [ ] Skeleton + empty state for lists; lucide icons; no emoji; no raw hex in TSX
