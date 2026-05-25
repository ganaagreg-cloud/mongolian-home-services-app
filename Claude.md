# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev           # Next.js dev server (localhost:3000, Turbopack)
pnpm build         # Production build
pnpm start         # Production server
pnpm lint          # ESLint
npx tsc --noEmit   # TypeScript type check

# Docker
docker compose up --build        # Start web + db (Postgres 16)
docker compose down              # Stop containers (volume preserved)
docker compose down -v           # Stop + wipe Postgres volume (full reset)
docker compose exec db psql -U postgres -d homeservices   # Postgres shell
docker compose logs web -f       # Stream Next.js logs
```

## MCP Server Configuration

Three MCP servers are configured in `~/.config/Code/User/mcp.json` (VS Code) or the Claude Code MCP settings:

### Playwright
- **Purpose:** Visual/UI testing, screenshots, browser automation
- **Usage:** Navigate to pages, take screenshots, interact with UI elements, assert DOM state
- **Common tasks:** Screenshot a route (`http://localhost:3000/register`), fill forms, click buttons, test user flows end-to-end

### Context7
- **Purpose:** Up-to-date library documentation lookup
- **Usage:** Resolve library-specific APIs (Next.js, Tailwind, Shadcn, Zod, etc.) without relying on stale training data
- **Common tasks:** Look up correct API signatures, migration guides, component props

### GitHub
- **Purpose:** Repository management, PR/issue operations
- **Usage:** List repos, create/review PRs, manage issues, check CI status
- **Common tasks:** `gh repo list`, `gh pr create`, `gh issue view`

## Testing Workflows

### Visual / UI Testing (Playwright)
1. Start the dev server: `pnpm dev`
2. Use Playwright MCP to navigate to the target route
3. Take a screenshot and inspect layout against the design token checklist
4. Interact with elements (click, type) to verify interactive states

### User Flow Testing
- Login flow: phone input → OTP → role selection → home screen
- Worker registration: DAN verification → police clearance upload → activation
- Booking flow: search → worker card → date/time → payment → confirmation
- Admin flow: pending verifications → approve/reject → dispute resolution

### Form Validation Testing
- Submit empty forms — verify all required-field errors appear
- Submit invalid phone numbers — verify format error
- Submit mismatched OTP — verify error state and retry logic

### Component Testing
- Verify `rounded-2xl` on all cards/buttons/inputs (never `rounded-lg`)
- Verify `active:scale-95` responds on tap/click
- Verify loading skeleton renders before data, empty state renders on no results
- Verify bottom nav tab highlights match `currentScreen`

## Common Tasks

### Login Flow Testing
```
1. Open http://localhost:3000
2. Enter a valid Mongolian phone number (8 digits, starts with 9x/8x)
3. Verify OTP screen appears
4. Enter 6-digit OTP
5. Verify redirect to home screen with correct role
```

### API Integration Testing
- All routes live under `app/api/`
- Auth header: `Authorization: Bearer <token>`
- Test with: `curl -X POST http://localhost:3000/api/auth/send-otp -d '{"phone":"99001234"}'`
- Verify Zod validation rejects malformed input with 400
- Verify unauthenticated requests to protected routes return 401

### Test Generation for CI/CD
- Install: `pnpm add -D jest @testing-library/react @testing-library/jest-dom playwright`
- Unit tests: `__tests__/` alongside components
- E2E tests: `e2e/` at repo root, one file per user flow
- Run in CI: `pnpm test && pnpm playwright test`

### UI/UX Analysis
- Use Playwright screenshot + Context7 docs to compare implementation against design tokens
- Check mobile viewport (390px wide) — the app targets iPhone-sized screens
- Verify `pb-24` / `pb-32` so content is never hidden behind the bottom nav or fixed CTA

## Architecture

Full-stack Next.js 16 App Router app. The UI layer is a client-side state machine; the data layer is a real PostgreSQL database (via `pg` Pool) running in Docker. Auth is JWT-based (stateless cookies via `jose`).

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
  screens/          # 25 full-screen views (one per Screen value)
  ui/               # shadcn/ui + Radix UI primitives (do not edit)
  bottom-nav.tsx    # User tab bar
  worker-bottom-nav.tsx
  login-screen.tsx
  onboarding-screen.tsx
  otp-screen.tsx
  register-screen.tsx
  dan-success-screen.tsx
  sos-button.tsx
  theme-provider.tsx
hooks/
  use-mobile.ts     # 768px breakpoint detector
  use-toast.ts
lib/
  auth.ts           # requireAuth(), setSessionCookie(), JWT sign/verify via jose
  types.ts          # shared TypeScript types (UserRole, Screen, OrderStatus, …)
  utils.ts          # cn() = clsx + tailwind-merge
lib/db/
  index.ts          # pg Pool singleton + schema init + seed on first boot
  schema.ts         # CREATE TABLE IF NOT EXISTS DDL (PostgreSQL)
  seed.ts           # dev seed data (workers, orders, banking info)
lib/mocks/
  dan.ts            # mock ДАН identity response
app/api/
  auth/             # send-otp, verify-otp, login, register, logout, me, dan, test-login
  orders/           # CRUD + match, accept, decline, upload, review, status
  workers/          # list, register, [id], me, me/availability, me/banking
  admin/            # stats, disputes, workers/pending, workers/[id]/verify
  payments/         # create-invoice (QPay V2 mock), dev-sim-pay
  sos/              # emergency alert (< 2s response requirement)
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

## Database Conventions

- Table names: `snake_case` plural (`service_workers`, `bookings`)
- Every table: `created_at` timestamp; mutable tables also have `updated_at`
- Soft delete via `deleted_at` — never hard-delete user or worker records
- Parameterized queries only: `db.query('SELECT … WHERE id = $1', [id])` — never string concatenation
- All queries are async: `await db.query(...)` — never block the event loop
- Booleans stored as `BOOLEAN` (not `0`/`1`) — pass `true`/`false` in query params
- Auto-increment PKs: `SERIAL` (int) for internal tables — `TEXT`/UUID only for externally-exposed tokens

## Security Rules

- Every `/api/` route: `requireAuth(req)` before any logic; verify the caller owns the resource
- API error responses: generic `{ error: "Request failed" }` — never expose stack traces or DB errors
- File uploads: JPEG/PNG only, max 5 MB, re-encode with sharp
- Never log: `password`, `token`, `registerNumber`, `imei`, `phoneNumber`

## Environment Variables

Docker Compose injects `DATABASE_URL` automatically for the `web` service. For local non-Docker dev, create `.env.local`:

```
# Injected by docker-compose.yml automatically — only needed for local pnpm dev
DATABASE_URL=postgresql://postgres:mongolia_secure_pass@localhost:5432/homeservices

# External integrations (not yet wired — fill in when integrating)
DAN_CLIENT_ID=
DAN_CLIENT_SECRET=
QPAY_API_KEY=
SOCIALPAY_API_KEY=
GOOGLE_MAPS_API_KEY=
FCM_SERVER_KEY=
JWT_SECRET=        # falls back to a hardcoded dev secret if unset
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

---

## Engineering Principles

### 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
* State assumptions explicitly. If uncertain, ask.
* If multiple interpretations exist, present them — don't pick silently.
* If a simpler approach exists, say so. Push back when warranted.
* If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

* No features beyond what was asked.
* No abstractions for single-use code.
* No "flexibility" or "configurability" that wasn't requested.
* No error handling for impossible scenarios.
* If you write 200 lines and it could be 50, rewrite it.

Ask: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:
* Don't "improve" adjacent code, comments, or formatting.
* Don't refactor things that aren't broken.
* Match existing style, even if you'd do it differently.
* If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
* Remove imports/variables/functions that YOUR changes made unused.
* Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the request.

### 4. Goal-Driven Execution
Define success criteria. Verify before claiming done.

* Transform vague tasks into verifiable goals before starting.
  Example: "Add validation" → "Reject inputs X/Y/Z with error; accept A/B/C"
* If tests exist, write/update them. If not, define manual verification steps.
* For multi-step tasks, state a brief plan with verify steps:
  1. [Step] → verify: [how to check]
  2. [Step] → verify: [how to check]
* Don't claim "done" until each verify step actually passes.

### 5. IDs
Primary keys are INTEGER (autoincrement) — faster joins, smaller storage.
Use TEXT/UUID only for tokens exposed externally (share links, invite codes,
session tokens) where unguessability matters.
Don't use TEXT as a primary key for internal tables.
