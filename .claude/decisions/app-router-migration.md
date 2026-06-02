# App Router Migration — Decision Record

**Sprint:** M3 (Booking flow routes)  
**Date:** 2026-06-02  
**Status:** Active — M1–M3 complete, M4–M6 pending

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
    orders/[orderId]/
      searching/               — SearchingWorkerScreen
      board/                   — ScheduledJobsBoardScreen
      confirm/                 — ConfirmWorkerScreen (instant match)
      confirm-scheduled/[workerId]/  — ConfirmScheduledWorkerScreen
    active/[orderId]/
      layout.tsx               — SosButton overlay (persists across sub-routes)
      page.tsx                 — ActiveBookingScreen
    review/[orderId]/          — ReviewScreen
  (worker)/
    layout.tsx                 — worker auth gate (is_worker required) + WorkerBottomNav + ModeToggle
    jobs/page.tsx              — WorkerJobsScreen (M1 reference migration)
```

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

## What M1–M3 does NOT do (deferred to M4–M6)

- Orders list screen (`/orders`) — M4.
- Chat screen (`/chat`) — M4. Chat button currently pushes `/chat` as a stub.
- Profile screen (`/profile`) — M5.
- Worker-mode screens (worker-active, worker-earnings, worker-profile) — M5.
- Deleting legacy state from `app/page.tsx` — M6.
- Full response-body type safety in the hc client (needs Zod validators on routes).
