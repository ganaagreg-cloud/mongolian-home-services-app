# App Router Migration — Decision Record

**Sprint:** M6 (Teardown — legacy state machine dissolved)  
**Date:** 2026-06-02  
**Status:** Migration complete — M1–M6 done. M7 (perf) deferred.

---

## Why we migrated — "no zero-downtime strangler"

Pre-launch. No production users. We chose a clean migration over a strangler-fig coexistence layer because:
- Zero-downtime coexistence adds complexity (two routing systems, state bridging) that exists only to protect users we don't have yet.
- The legacy `app/page.tsx` state machine is now a redirect dispatcher. Screen components are preserved (`components/screens/*`) and mounted one sprint at a time (M2–M5).
- M6 deletes the old state machine entirely.

---

## Rendering model

```
Browser request → middleware.ts (UX redirect, edge)
                ↓
        (app)/layout.tsx  OR  (worker)/layout.tsx  (Server Component)
                ↓
        fetch /api/auth/me with forwarded cookie  ← ONE server→Hono call per nav
                ↓
        session OK → <SessionProvider initialData={session}>
                ↓
        page.tsx (Server Component shell)
                ↓
        <ScreenComponent /> (Client Component)
                ↓
        useSWR() — client-side data fetches with credentials:include
```

**Server components**: auth gates (layouts), dispatcher (page.tsx), loading/error shells.  
**Client components**: all screen components, SessionProvider, bottom nav adapters, SWR fetches.

---

## 3-layer authorization

| Layer | Location | What it does |
|---|---|---|
| Edge UX | `middleware.ts` | Cookie absent → redirect(/login) early. NO role check. Best-effort on localhost dev (cross-port cookie behavior varies). |
| Server auth gate | `(app)/layout.tsx`, `(worker)/layout.tsx` | Server Component fetches `/api/auth/me` with forwarded cookie. No session → redirect(/login). Worker gate: !isWorker → redirect(/home). This is authoritative. |
| API authz | All Hono routes (`requireAuth`, `requireAdmin`) | Token-level enforcement. The web server is just a consumer — it cannot grant access. |

**Invariant**: middleware MUST NOT grant access based on role. Authz lives in layouts + Hono API, never in middleware.

---

## Typed hc client

`packages/api/src/index.ts` exports `type AppType = typeof app`.  
`packages/web/lib/api-client.ts` provides:

```ts
// Server components (auth gates): forward session cookie
createServerClient(cookieHeader) → hc<AppType>(BASE, { headers: { cookie }, init: { cache: 'no-store' } })

// Client components: browser sends cookie automatically
browserClient → hc<AppType>(BASE, { init: { credentials: 'include' } })
```

`import type { AppType } from '@homeservices/api'` is erased by TypeScript before bundling — no Node.js code reaches the browser bundle. This is safe.

**Current state**: path-level type safety only. Response bodies are typed as `Response` until route handlers add Zod validators (future sprint).

---

## Session flow (no refetch flash)

1. Layout server component fetches `/api/auth/me` once per navigation.
2. Result is passed as `initialData` to `<SessionProvider>`.
3. Client components read session via `useSession()` — no additional fetch on first render.
4. Auth state lives ONLY in `SessionProvider`. It is NOT duplicated in Zustand or any other store.

---

## Route groups

```
app/
  page.tsx                     — server dispatcher (→/login, /home, /jobs)
  layout.tsx                   — html/body, SWR global config, Toaster
  (auth)/
    layout.tsx                 — redirect authed users to /
    login/page.tsx             — full auth flow (login + register + forgot-password + OTP)
  (app)/
    layout.tsx                 — user auth gate + SessionProvider + AppBottomNav + ModeToggle
    home/page.tsx              — HomeScreen (M1 reference migration)
    orders/new/                — CreateOrderScreen
    orders/page.tsx           — OrdersScreen (M5)
    orders/[orderId]/
      searching/               — SearchingWorkerScreen
      board/                   — ScheduledJobsBoardScreen
      confirm/                 — ConfirmWorkerScreen (instant match)
      confirm-scheduled/[workerId]/  — ConfirmScheduledWorkerScreen
    active/[orderId]/
      layout.tsx               — SosButton overlay (persists across sub-routes)
      page.tsx                 — ActiveBookingScreen
    review/[orderId]/          — ReviewScreen
    chat/[orderId]/page.tsx   — ChatScreen (M5; 3s poll; no phone field)
    profile/page.tsx          — ProfileScreen (M5)
    settings/page.tsx         — PersonalInfoScreen (M5; route name diverges from screen name)
  (worker)/
    layout.tsx                 — worker auth gate (is_worker + activeMode=worker required) + WorkerBottomNav + ModeToggle
    jobs/page.tsx              — WorkerJobsScreen (M1 reference; M4 upgraded to server shell)
    jobs/[id]/page.tsx         — WorkerActiveScreen with specific orderId (drill-down)
    worker-active/page.tsx     — WorkerActiveScreen without orderId (auto-fetches active job)
    worker-earnings/page.tsx   — WorkerEarningsScreen
    worker-profile/page.tsx    — WorkerProfileScreen
```

### Worker route URL contract

| File | URL |
|---|---|
| `(worker)/jobs/page.tsx` | `/jobs` |
| `(worker)/jobs/[id]/page.tsx` | `/jobs/[id]` |
| `(worker)/worker-active/page.tsx` | `/worker-active` |
| `(worker)/worker-earnings/page.tsx` | `/worker-earnings` |
| `(worker)/worker-profile/page.tsx` | `/worker-profile` |

Worker URLs are flat with `worker-` prefix. No nesting under `/worker/` segment —
avoids route group conflict with `app/(worker)`. Pattern: `(worker)/worker-{name}/`
for all worker-specific routes except `/jobs`.

`AppWorkerBottomNav` hrefs verified against actual routes: `/jobs`, `/worker-active`,
`/worker-earnings`, `/worker-profile` — all correct as of M4.

---

## M3 pattern: server shell + client screen

Every booking flow route follows this pattern:

**`page.tsx`** — async Server Component, awaits params, delegates to screen:
```tsx
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <SomeScreen orderId={orderId} />
}
```

**Screen component** — `'use client'`, receives only primitive ids (not full objects):
- Fetches its own data via `useSWR` using `fetcher` from `lib/api-client.ts`
- SWR chaining: fetch order → get `workerId` → fetch worker (for confirm screens)
- Navigation via `useRouter()` — no `onNavigate`/`setCurrentScreen` callbacks
- Back navigation via `router.back()`

**`loading.tsx`** — skeleton that matches the screen's real layout (no generic spinner).  
**`error.tsx`** — `'use client'`, `useEffect` logs error, Mongolian error message, reset button.

**Ambient state eliminated**: screens no longer receive `worker: MatchedWorker` or `order: Order` as props from a parent state machine. They own their own data fetching.

**SOS layout**: `active/[orderId]/layout.tsx` is a Server Component that wraps children with `<SosButton orderId={orderId} bottomClass="bottom-24" />`. The layout accepts `params: Promise<unknown>` (Next.js LayoutProps constraint) and casts internally: `const { orderId } = (await params) as { orderId: string }`.

---

## M2 pattern: route-aware Link nav + ModeToggle

- `AppBottomNav` / `AppWorkerBottomNav`: `<Link href>` tabs, active state via `usePathname().startsWith(href)`.
- `ModeToggle`: reads current mode from pathname, `PATCH /api/me/mode` to persist, toast+revert on failure. Rendered in both `(app)/layout.tsx` and `(worker)/layout.tsx`. `active_mode` written ONLY by ModeToggle.

---

## M4 deviations from sprint brief

- Sprint brief listed bottom nav hrefs as `/earnings` and `/worker/profile`. Actual M2 `AppWorkerBottomNav` code uses `/worker-earnings` and `/worker-profile`. Routes were created to match the code, not the brief.
- `/worker-active` route created to match the `/worker-active` nav tab (auto-fetches active order). `/jobs/[id]` is the drill-down for a specific accepted job. Both render `WorkerActiveScreen`.
- `WorkerProfileScreen` no longer receives `phone` prop — `SessionData` has no phone field. Screen shows 'Утас нэмааг?й' fallback verbatim.
- Worker layout now also guards `activeMode !== 'worker'` (was only `!isWorker` in M1). Redirects to `/home?hint=worker_mode`; `WorkerModeHintToast` in `(app)/layout.tsx` shows the Mongolian toast.

## M5 deviations and notes

- `/chat` tab removed from `AppBottomNav` — chat is a drill-down (`/chat/[orderId]`) reached from the active-booking screen, not a top-level destination. No thread-list screen exists.
- `/settings` mounts `PersonalInfoScreen` — route name and screen file name diverge intentionally. Comment in `settings/page.tsx` marks it for grep.
- `session.screen: string` in `SessionData` is dead ambient state — no M5 screen reads it. **M6 residual:** remove from `SessionData` interface and strip from `/api/auth/me` response.
- OTP re-verification post-auth (phone/email in `/settings`) sends the OTP but does not navigate to a verify screen — that flow is deferred. Success toast shown instead.
- `orders/[id]` route NOT created — `OrdersScreen` is list-only; detail is handled by existing M3 routes (`/active/[orderId]`, `/orders/[orderId]/board`).
- Profile sub-screens (`/help`, `/privacy`, `/saved-workers`) defer to a future sprint; menu items `router.push()` to nonexistent routes → clean Next.js 404.

## What M1–M5 does NOT do (deferred to M6)

- `app/page.tsx` full teardown + deletion of legacy state machine remnants — **done in M6**.
- `session.screen` field removal from `SessionData` + `/api/auth/me` response — **done in M6**.
- Profile sub-screens: `/help` (HelpScreen), `/privacy` (PrivacyScreen), `/saved-workers` (SavedWorkersScreen) — future sprint.
- Post-auth OTP verify flow for phone/email re-verification — future sprint.
- Full response-body type safety in the hc client (needs Zod validators on routes).

## M6 — Teardown (complete)

**What was removed:**
- `screen` field from `SessionData` interface (`context/session-context.tsx`) — was dead; no client component read it.
- `screen` computed field from `GET /api/auth/me` response (`packages/api/src/routes/auth.ts`) — replaced by explicit `role` and `needsOnboarding` fields.
- `components/bottom-nav.tsx` — original callback-based user nav (zero imports post-M2).
- `components/worker-bottom-nav.tsx` — original callback-based worker nav (zero imports post-M2).
- Stale comment in `tests/e2e/order-flows-dual.spec.js` referencing `setCurrentScreen`.

**What replaced it:**
- `/api/auth/me` now returns `role: string` and `needsOnboarding: boolean` instead of `screen: string`.
- `app/admin/layout.tsx` admin gate: `role !== 'admin'` (was `screen !== 'admin'`).
- `app/page.tsx` dispatcher: `needsOnboarding → /login` (was `screen === 'oauth-onboarding' → /onboarding`; `/onboarding` route never existed — pre-existing bug now fixed).

**Screen type:** Never existed as a named type — nothing to remove.

**Deferred to future sprints:**
- Profile sub-screens (`/help`, `/privacy`, `/saved-workers`).
- Post-auth OTP re-verification flow.
- Full hc client response-body type safety (Zod validators on routes).
- M7 perf work.
