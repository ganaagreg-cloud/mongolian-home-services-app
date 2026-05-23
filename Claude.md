# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev           # Next.js dev server (localhost:3000, Turbopack)
pnpm build         # Production build
pnpm start         # Production server
pnpm lint          # ESLint
npx tsc --noEmit   # TypeScript type check (no typecheck script yet)
```

Jest and Playwright are not installed yet — add them before writing tests.

## Architecture

This is a **UI prototype** — all data is hardcoded/mocked. There is no backend, database, or real auth yet.

### Navigation: State Machine, Not Next.js Routing

The entire app lives in a single Next.js page (`app/page.tsx`). Navigation is driven by a `currentScreen` state variable of type `Screen` (a union of ~20 string literals). Every screen transition is a `setCurrentScreen(...)` call. There are no Next.js `<Link>` components or `router.push()` calls in use.

`app/page.tsx` owns all shared state (`userRole`, `currentScreen`, `phone`, `selectedWorkerId`, `hasActiveBooking`) and passes callbacks down to screens as props.

### Three User Roles

`UserRole = 'user' | 'worker' | 'admin'`

Role determines which bottom nav is rendered and which screens are reachable:
- **user** — home, search, booking, active-booking, review, profile, orders, chat
- **worker** — worker-register, worker-jobs, worker-active, worker-earnings, worker-profile
- **admin** — admin, admin-verify, admin-disputes

### Component Organization

```
components/
  screens/          # 13 full-screen views (one per Screen value)
  ui/               # shadcn/ui + Radix UI primitives (do not edit)
  bottom-nav.tsx    # User tab bar
  worker-bottom-nav.tsx
  login-screen.tsx
  onboarding-screen.tsx
  otp-screen.tsx
  dan-success-screen.tsx
  theme-provider.tsx
hooks/
  use-mobile.ts     # 768px breakpoint detector
  use-toast.ts
lib/
  utils.ts          # cn() = clsx + tailwind-merge
```

Planned (not created yet):
```
app/api/            # API routes
lib/db.ts           # pg.Pool
lib/dan-auth.ts     # ДАН OAuth
lib/payments/       # QPay + SocialPay
db/migrations/      # Plain SQL files
```

## Key Technical Facts

- **Next.js 16.2.6** App Router + Turbopack, no `src/` directory
- **Tailwind CSS 4** — `@import "tailwindcss"` in globals.css, NOT the v3 `@tailwind` directives
- **Path alias:** `@/*` → repo root `./` (tsconfig.json)
- **Package manager:** pnpm
- **TypeScript strict mode**

## Domain Terms (Монгол → Code)

| Монгол | English | Code symbol |
|--------|---------|-------------|
| ДАН | Mongolia's national digital identity | `danAuth` |
| Захиалга | Booking / order | `booking` |
| Цэвэрлэгч | Cleaner / service worker | `serviceWorker` |
| Шимтгэл | Platform commission (15%) | `commission` |
| Хохирлын сан | Damage fund (2%) | `damageFund` |
| Escrow | Pre-held payment released after job completion | `escrowRelease` |

## Critical Business Rules

- Cash payments are **forbidden** — all money goes through Escrow
- Service workers need **both** DAN verification AND police clearance before activation
- Worker phone numbers must **never** reach clients — use platform chat only
- `/api/sos` must respond in < 2s — no blocking logic ever
- Before/After photos are **required** for every booking
- Money values: **integers in MNT** (no decimals, no floats)
- Platform takes 15% commission + 2% damage fund from worker payouts

## Code Style

- No `any` — strict TypeScript throughout
- ES modules only (`import/export`)
- All API routes: validate with Zod → `requireAuth(req)` → verify resource ownership
- Wrap all Mongolian-facing strings in `t()` (i18n hook, not yet installed)
- Use `cn()` from `lib/utils.ts` for all className composition

## Database Conventions (for when pg is added)

- Table names: `snake_case` plural (`service_workers`, `bookings`)
- Every table: `created_at`, `updated_at` timestamps
- Soft delete via `deleted_at` — never hard-delete user or worker records
- Parameterized queries only: `db.query('SELECT … WHERE id = $1', [id])` — never string concatenation

## Security Rules

- Every `/api/` route: `requireAuth(req)` before any logic; verify the caller owns the resource
- API error responses: generic `{ error: "Request failed" }` — never expose stack traces or DB errors
- File uploads: JPEG/PNG only, max 5 MB, re-encode with sharp
- Never log: `password`, `token`, `registerNumber`, `imei`, `phoneNumber`

## Environment Variables

Add `.env.local` before any DB/API work:

```
DATABASE_URL=postgres://user:pass@host:5432/dbname
DAN_CLIENT_ID=
DAN_CLIENT_SECRET=
QPAY_API_KEY=
SOCIALPAY_API_KEY=
GOOGLE_MAPS_API_KEY=
FCM_SERVER_KEY=
```

---

## Production UI Design Standards

All rules below are extracted from the production screen components — not aspirational, these are the actual classes in use.

### Design Token System

```
--primary:         #1E40AF   → blue-800  (active states, selections, links)
--accent:          #F97316   → orange-500 (CTAs, star fills, booking actions)
--success:         #16A34A   → green-600  (verified, completed, positive)
--destructive:               → red (errors, SOS, delete, logout)
--card:            #F8FAFC   → slate-50  (all card/panel backgrounds)
--background:      #FFFFFF   → page background
--border:          #E5E7EB   → gray-200  (all borders and dividers)
--muted-foreground:#6B7280   → gray-500  (labels, metadata, placeholders)
--radius:          1rem      → 16px base (larger than shadcn default)
```

**Dark mode equivalents exist** — always use semantic tokens, never raw hex or `gray-*`/`slate-*` classes on structural elements.

**TWO accent colors — intentional:**
- `primary` (blue): selection states, active tabs, focus rings, link text, icon tints
- `accent` (orange): book/CTA buttons, star ratings, promo highlights

**Semantic tint pattern (used everywhere):**
```tsx
bg-primary/10 text-primary        // icon container, info badge
bg-success/10 text-success        // verified badge, escrow banner
bg-accent/10 text-accent          // filter button active, worker booking CTA
bg-destructive/10 text-destructive // warning row, dispute action
```

**Font:** Always Geist (`font-sans`). Never Inter, Roboto, Arial.

### Border Radius — ALL `rounded-2xl`

`--radius: 1rem` makes everything more rounded than standard shadcn.

| Element | Class |
|---------|-------|
| Cards, panels, banners | `rounded-2xl` |
| Primary buttons, inputs | `rounded-2xl` |
| Secondary buttons, date chips | `rounded-2xl` |
| Icon square containers | `rounded-xl` |
| Icon circular buttons | `rounded-full` |
| Filter chips, badges | `rounded-full` |

**Never use `rounded-lg` or `rounded-xl` for cards/buttons/inputs.**

### Spacing Scale

Horizontal gutter: **always `px-6`** on every section. Full-width card wrappers use `mx-6`.

```
pt-12     → top of page (safe-area / status bar)
mt-6      → between all major page sections
mt-4      → between related sub-elements
mt-3      → label → input, section heading → grid
space-y-3 → card list items
space-y-4 → form fields
gap-3     → 3-col category grids, horizontal scroll items
gap-4     → avatar + content, admin KPI grid
pb-24     → pages with fixed bottom nav
pb-32     → pages with fixed bottom CTA button
pb-8      → admin/desktop-style pages
```

### Height Scale

| Component | Class |
|-----------|-------|
| Primary CTA buttons | `h-14` |
| Search inputs, phone input | `h-12` |
| Icon circle/square buttons | `h-10 w-10` |

### Shadow Ladder

```
shadow-sm  → default card/input/button rest state
shadow-md  → active selection, elevated buttons, confirmed booking banner
shadow-lg  → gradient hero cards (wallet balance, promo banners)
```

Never use `shadow-xl` or `drop-shadow-*`.

Active: `bg-primary text-primary-foreground shadow-md`
Inactive: `bg-card text-foreground shadow-sm`

### Typography Hierarchy

```tsx
<h1 className="text-xl font-bold text-foreground">          // page title
<h1 className="text-2xl font-bold text-foreground">         // auth/onboarding
<h2 className="text-lg font-bold text-foreground">          // section heading
<h2 className="font-semibold text-foreground">              // card/form section label
<p className="font-semibold text-foreground">               // card title / list primary
<p className="text-sm text-muted-foreground">               // secondary info
<p className="text-sm font-semibold text-primary">          // price / highlighted value
<p className="text-2xl font-bold text-foreground">          // large stat number
<p className="text-xs text-muted-foreground">               // meta / timestamp
<span className="text-[10px] font-medium text-success">     // tiny badge label
```

### Interactive States

Every tappable element needs `active:scale-95 transition-all`.

**Selection toggle** (date chips, time slots, payment methods):
```tsx
// Active:   bg-primary text-primary-foreground shadow-md
// Inactive: bg-card text-foreground shadow-sm
// Always add: transition-colors
```

**Back/icon buttons:**
```tsx
className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors"
```

**CTA buttons:**
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

### Icon Rules

All icons from `lucide-react`:
- Inline / nav items: `h-5 w-5`
- Inside `h-10 w-10` container: `h-5 w-5`
- Star rating: `h-3.5 w-3.5 fill-accent text-accent`
- Empty state feature icon: `h-10 w-10 text-muted-foreground`

**Icon container (tinted square):**
```tsx
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
  <Icon className="h-5 w-5 text-primary" />
</div>
```

**Notification badge:**
```tsx
<span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
  2
</span>
```

### Card Structures

**Standard info card:**
```tsx
<div className="mx-6 rounded-2xl bg-card p-4 shadow-sm">
```

**Prominent/gradient card:**
```tsx
<div className="mx-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg">
```

**Grouped menu list** (profile items, settings — ONE card, dividers inside):
```tsx
<div className="mx-6 rounded-2xl bg-card shadow-sm overflow-hidden">
  {items.map((item, index) => (
    <button className={`flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${
      index !== items.length - 1 ? 'border-b border-border' : ''
    }`}>
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

**Worker/person card:**
```tsx
<div className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm">
  <div className="flex items-start gap-3">
    <Avatar className="h-14 w-14 shrink-0">
      <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{name[0]}</AvatarFallback>
    </Avatar>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate font-semibold text-foreground">{name}</p>
        {verified && (
          <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">ДАН</span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
        <span className="text-sm font-medium text-foreground">{rating}</span>
        <span className="text-sm font-semibold text-primary">₮{price}/цаг</span>
      </div>
    </div>
  </div>
  <Button className="mt-3 h-11 w-full rounded-xl bg-accent shadow-md hover:bg-accent/90">Захиалах</Button>
</div>
```

### Page Shell Patterns

```tsx
// Standard page with bottom nav (pb-24)
<div className="flex min-h-screen flex-col bg-background pb-24">
  <div className="flex items-center justify-between px-6 pt-12">
    <h1 className="text-xl font-bold text-foreground">Title</h1>
  </div>
  {/* sections: mt-6 px-6 */}
</div>

// Page with back button
<div className="flex items-center gap-4 px-6 pt-12">
  <button className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm">
    <ArrowLeft className="h-5 w-5 text-foreground" />
  </button>
  <h1 className="text-xl font-bold text-foreground">Title</h1>
</div>
```

### Fixed Bottom CTA

```tsx
{/* Add pb-32 to page wrapper */}
<div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
  <Button disabled={!canSubmit} className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md disabled:opacity-50">
    Confirm Action
  </Button>
</div>
```

### Horizontal Scroll

```tsx
<div className="flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
  <button className="min-w-[60px] rounded-2xl ...">...</button>
</div>
```

### Price Summary Card

```tsx
<div className="mx-6 rounded-2xl bg-card p-4 shadow-sm">
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Subtotal (2h)</span>
    <span className="text-foreground">₮50,000</span>
  </div>
  <div className="mt-3 border-t border-border pt-3 flex justify-between">
    <span className="font-semibold text-foreground">Total</span>
    <span className="font-bold text-primary text-lg">₮55,000</span>
  </div>
</div>
```

### Loading Skeleton

```tsx
<div className="space-y-4">
  {[1, 2, 3].map(i => (
    <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  ))}
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16">
  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
    <Search className="h-10 w-10 text-muted-foreground" />
  </div>
  <p className="mt-4 text-lg font-semibold text-foreground">No results found</p>
  <p className="mt-1 text-sm text-muted-foreground">Try a different search term</p>
</div>
```

### OR Divider

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

### Progress / Status Timeline

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
    </div>
  )
})}
```

### Pre-Submit UI Checklist

Before returning any UI component, verify:

- [ ] `rounded-2xl` on all cards, buttons, inputs (not `rounded-lg`)
- [ ] `px-6` horizontal gutter, `mx-6` on full-width card wrappers
- [ ] `pt-12` safe-area top on page headers
- [ ] `mt-6` between every major page section
- [ ] `pb-24` (bottom nav) or `pb-32` (fixed CTA) on page wrapper
- [ ] `h-14` primary CTAs, `h-12` inputs, `h-10 w-10` icon buttons
- [ ] `shadow-sm` on cards, `shadow-md` on active/elevated buttons
- [ ] `active:scale-95` on all tappable elements
- [ ] `bg-primary/10 text-primary` tint on icon containers
- [ ] `accent` (orange) on booking CTAs, `primary` (blue) for active states
- [ ] Grouped list items in one `rounded-2xl bg-card overflow-hidden` with `border-b border-border` dividers
- [ ] Lucide React for all icons (no emoji, no inline SVG)
- [ ] `text-muted-foreground` on metadata, labels, subtitles
- [ ] Loading skeleton + empty state present for any list/grid
