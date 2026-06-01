# PROJECT PRIMER — Mongolian Home Services App

> Context primer for future sessions. Every claim below was verified against code
> (file paths cited, no line numbers). Where `CLAUDE.md`/`.claude/decisions/*`
> disagree with the code, **both are documented and the current reality is marked**.
> Mocked-vs-real integrations are flagged explicitly.

---

## 1. What it is

A **mobile-first marketplace for on-demand home services** in Mongolia (Улаанбаатар),
UI entirely in Mongolian. A client posts a job (e.g. cleaning), the platform matches a
vetted worker, payment is held in **escrow**, and funds release to the worker only after
the job is completed with before/after photos.

- **Core differentiator:** trust + safety layer for an informal market — ДАН (national
  e-ID) identity verification, police-clearance vetting, escrow-only payments (no cash),
  worker-phone masking, in-app SOS, and a mandatory photo trail per job.
- **Legal positioning:** the platform is an **intermediary** (мэдээллийн технологийн
  зуучлагч), not the service provider — codified in `packages/web/lib/legal-content.ts`.
- **MVP scope:** launches on **cleaning only** (`pricing_model = 'area' | 'unit'`), where
  the price is known at booking, so payment is **charge-immediately via escrow**. Inspection/
  survey/repair pricing (authorize-then-capture) is built in the data model but **deferred to
  Phase 2** (see `CLAUDE.md` → Payment Model).

---

## 2. Who it's for

- **Client (хэрэглэгч)** — books a cleaning, pays up front into escrow, chats with the
  matched worker through the platform (never sees their phone), confirms completion, reviews.
- **Worker (ажилтан)** — a `users` row with `is_worker = true`. Registers via a 5-step flow
  (ДАН → police clearance → IMEI → specialty + hourly price → bank account), waits for admin
  approval, then toggles into "worker mode" to receive/accept jobs and get paid out.
- **Admin** — separate role (`role = 'admin'`). Approves/rejects worker verifications and bank
  details, resolves disputes, manages master data (service types, districts, pricing rules,
  platform settings), views finance. Two admin surfaces exist (see §6/§7).

A single person can be both client and worker; they switch with a segmented toggle that flips
`active_mode` between `'user'` and `'worker'` (`PATCH /api/me/mode`, gated on `is_worker`).

---

## 3. Non-negotiable business rules — enforced values vs documentation

Pulled from code. ⚠️ marks rules that are **documented but NOT actually enforced in code**.

| Rule | Documented | Actual in code | Status |
|------|-----------|----------------|--------|
| **Cash forbidden / escrow only** | yes | `POST /api/orders` rejects with 402 unless a `payment_intents` row exists with `paid_at IS NOT NULL`; order inserted with `payment_status='paid'`; payout only on completion | ✅ enforced |
| **Escrow release on completion** | yes | `PATCH /api/orders/:id/status → 'completed'` writes a `transactions` row (`type='earning'`) inside a DB transaction; blocked if an unresolved dispute exists (409) | ✅ enforced |
| **ДАН + police clearance AND-gate before activation** | yes (CLAUDE.md, architecture.md) | **Not enforced.** `PATCH /api/admin/workers/:id/verify` (approve) sets `is_active=true` with **no check** on `dan_verified` or `police_file`. Registration requires a `policeFile` string but never verifies ДАН. Matching filters on `is_active` + banking-verified + `rating>=4.0`, **not** `dan_verified`. | ⚠️ **procedural only** (admin eyeballs the data on the verify screen) |
| **Worker phone never reaches client** | yes | Client-facing reads (`GET /api/orders/:id`, `GET /api/workers`, worker cards, acceptances) select `u.name` but **never** `u.phone`. Admin-only reads do expose phone. | ✅ enforced |
| **Before/After photos required** | yes | `PATCH /api/orders/:id/status`: `in_progress` blocked (422) without `before_photo_url`; `completed` blocked (422) without `after_photo_url` | ✅ enforced |
| **Money = integers in MNT** | yes | All money columns are `INTEGER`; no floats stored | ✅ enforced |
| `Math.floor` vs `Math.round` | prompt expects `Math.floor` | **Mixed:** `lib/pricing.ts` (web + api) and the server-side total recompute in `POST /api/orders` use `Math.round`; the **escrow payout split** at completion/cancel (`orders.ts`) uses `Math.floor`. Integer-MNT invariant holds either way. | ⚠️ inconsistent rounding fn |
| **15% commission + 2% damage fund** | yes | Seeded in `app_settings` (`platform_commission='15'`, `damage_fund_rate='2'`); read via `getSettings()`. Payout = `total − floor(total×0.15) − floor(total×0.02)` | ✅ enforced (admin-editable) |
| **Urgent surcharge** | "+20%" hinted in UI | `app_settings.urgent_fee_multiplier='0'` and `DEFAULT_PLATFORM_SETTINGS.urgent_surcharge=0.0` → urgent toggle currently adds **₮0**. (One UI card hardcodes "Яаралтай (+20%)" text — cosmetic only.) | ⚠️ disabled in data |
| **SOS responds < 2s, no blocking logic** | yes | `POST /api/sos` **awaits a DB INSERT** into `sos_alerts` on the critical path before responding; only `dispatchNotifications()` is fire-and-forget. Fast, but the INSERT is blocking and there is no enforced timeout. | ⚠️ one blocking op by design |
| **Self-matching prevention** | yes | `/match` query excludes `w.user_id != orders.user_id`; `POST /api/orders/:id/accept` returns 403 if `order.user_id === session.sub` | ✅ enforced |
| **is_active (admin) vs is_available (worker)** | yes | Only admin verify/PATCH sets `is_active`; worker sets `is_available` via `/api/workers/me/availability`; matching requires both true | ✅ enforced |
| **Never hard-delete users/workers** | yes | `users.deleted_at` soft-suspend; workers soft-rejected via `rejected_at` | ✅ enforced |

---

## 4. End-to-end booking flow

**Client (instant/cleaning):**
1. `create-order` screen (5 steps): service → strategy + date/time → notes/photos → price → confirm.
2. On confirm: `POST /api/payments/create-invoice` → creates a `payment_intents` row, returns
   mock QPay invoice (bank deeplinks + base64 QR). **Payment is mocked** — in dev,
   `POST /api/payments/dev-sim-pay` marks the intent `paid_at`; in prod a QPay webhook would
   (Phase 2, parked).
3. `POST /api/orders` verifies the intent is paid, **recomputes the total server-side** (never
   trusts client), inserts the order (`payment_status='paid'`), and **consumes** the intent
   (one invoice = one order). Initial status: `searching_worker` (instant) /
   `pending_acceptances` (scheduled) / `awaiting_quote` (inspection|survey).

**Matching:**
- **Instant:** `POST /api/orders/:id/match` offers the job to one random eligible worker
  (active + available + `rating>=4.0` + banking verified + has the service in `worker_services`
  + not the order's own creator). Worker has ~70s to accept (`accept-instant`) or it times out;
  up to 5 attempts, then `no_workers_found`.
- **Scheduled:** workers call `POST /api/orders/:id/accept` to register interest
  (`order_acceptances`); the client picks one from the board.

**Worker:**
4. Accepts → moves through statuses; must `POST /api/orders/:id/upload` a **before** photo to
   start (`in_progress`) and an **after** photo to finish (`completed`).
5. On `completed`: escrow releases — a `transactions` `earning` row is written for
   `total − commission − damage_fund` (inside a BEGIN/COMMIT; blocked if dispute open).

**After:** client reviews (`POST /api/orders/:id/review`, updates worker rating). Disputes
(`/api/disputes`, `disputes` table) freeze payout until an admin resolves with optional
compensation. Cancellation: free in early statuses; a `late_cancel_fee` applies once a worker
is assigned and the job is <1h away; refund = `total − fee`.

---

## 5. Pricing model

Logic in **`packages/api/src/lib/pricing.ts`** (server, authoritative) and a near-duplicate in
**`packages/web/lib/pricing.ts`** (client preview). Archetypes keyed by `service_types.pricing_model`:

| Archetype | Subtotal formula | MVP? |
|-----------|------------------|------|
| `area` | `max(qty_m² × base_rate, min_charge)` | ✅ MVP (cleaning) |
| `unit` | `max(qty × base_rate, min_charge)` | ✅ MVP |
| `inspection` | `base_rate (call-out) + approved quoteAmount` | ⏸ Phase 2 |
| `survey` | `quoteAmount` only (price unknown until on-site) | ⏸ Phase 2 |

Derived: `platformFee = round(subtotal × commission)`, `damageFund = round(subtotal × damage_fund)`,
`urgentSurcharge = round(subtotal × urgent_surcharge)` (currently 0), `total = subtotal + urgentSurcharge`,
`workerReceives = subtotal − platformFee − damageFund`. Rates come from `app_settings`
(admin-editable), defaults `commission 0.15 / damage_fund 0.02 / urgent 0.0`.

Inspection/survey need an authorize-then-capture flow (`order_quotes` table exists; quote
submit/respond endpoints exist) but the **escrow capture for quote deltas is deferred** until
QPay V2 delta re-authorization is confirmed (`CLAUDE.md`).

---

## 6. Roles + navigation model

- **Roles:** `UserRole = 'user' | 'admin'`. Workers are `user` rows with `is_worker=true`;
  `role` only ever tracks `'user' | 'admin'` (a migration normalizes legacy `'worker'` → `'user'`).
- **Worker mode:** `active_mode ∈ {'user','worker'}`, toggle visible only when `is_worker=true`.
- **Consumer/worker app navigation = client-side state machine**, not Next.js routing:
  `packages/web/app/page.tsx` owns all shared state and switches on a `currentScreen: Screen`
  union (~26 string literals) plus a separate `preAuthScreen` for login/register/forgot/otp/pin.
  No `<Link>` / `router.push()` in screens (enforced by hooks). `window.location.reload()` only
  after auth-state changes.
  - **user mode:** home, create-order, searching-worker, confirm-worker, scheduled-jobs-board,
    confirm-scheduled-worker, active-booking, review, orders, chat, profile, personal-info,
    saved-workers, help, privacy
  - **worker mode** (needs `is_worker`): worker-jobs, worker-active, worker-earnings, worker-profile
  - **admin screens** also exist inside `page.tsx` (admin, admin-verify, admin-disputes, admin-banking)
- **Auth = exactly three states** (`.claude/decisions/auth.md`): unauthenticated → login/register;
  authenticated-but-no-phone → `oauth-onboarding`; authenticated → route by role + `active_mode`.
  Auth is checked **only** in `page.tsx` via `authClient.useSession()` — **never** in middleware
  (would cause redirect loops).

---

## 7. Real tech stack & repo shape — current migration state

**Turborepo + pnpm workspaces** (`pnpm@11.3.0`). Four packages:

| Package | Stack | Port | Role |
|---------|-------|------|------|
| `packages/api` | Hono + `@hono/node-server`, `tsx`, `pg` Pool, Better Auth, Zod | 4000 | **All** routes, auth, DB |
| `packages/web` | Next.js **16.2.6** App Router + Turbopack, React 19, Tailwind **v4**, SWR, Radix/shadcn | 3000 | Consumer/worker UI |
| `packages/admin` | Next.js 16 (minimal) | 3001 | Standalone admin panel |
| `packages/shared` | TypeScript types only (no runtime) | — | Shared `@homeservices/shared` |

- **DB:** PostgreSQL 16 (Docker), schema via idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER`
  migrations run on boot from `packages/api/src/db/schema.ts`. **One `pg.Pool` per process**
  (shared by Better Auth — fixed in Sprint E).
- **Auth:** Better Auth (`packages/api/src/auth.ts`) with **both** email+password **and**
  Google/Facebook OAuth. Session cookie `better-auth.session_token`. `BETTER_AUTH_URL` must equal
  the API origin. Cross-subdomain cookies (`SameSite=None; Secure`, domain `.homeservice.mn`)
  enabled only in prod. A second **credential admin cookie** (`hs-admin-session`, HMAC token)
  lets the admin panel log in without OAuth.

**Migration reality vs docs (the "single page, no app/api" claims):**
- ✅ `packages/web` has **no `app/api/` route handlers** (verified — architecture rule holds).
- ⚠️ But `packages/web` is **not** purely a single page. It also contains **legacy routed Next.js
  pages**: `app/(auth)/{login,otp,register}` and a full `app/admin/{disputes,finance,master-data,
  orders,users,workers,...}` tree, plus `app/offline`. `.claude/decisions/architecture.md`
  acknowledges the legacy `app/admin` and says new admin work goes in `packages/admin`. So today
  there are **two admin surfaces** (legacy in-web + standalone `packages/admin`) and the
  "entire app lives in one page" statement applies to the **consumer/worker PWA only**.
- ⚠️ **Duplicate code:** `pricing.ts` and `db/schema.ts` exist in both `packages/api` and
  `packages/web/lib`. The API copies are authoritative; `packages/web/lib/db/` (a third, dead
  `pg.Pool` + seed) is slated for deletion in the planned **Sprint 4.1** (app/api removal).
- **Seed (`packages/api/src/db/seed.ts`)** is stripped to **admin account only** (gated on
  `ADMIN_PW_HASH` env) + master data (service types, districts, app_settings, pricing_rules).
  No fake workers/orders. Seed is guarded off in production.

**Mocked vs real:**
- 🟡 **QPay payments — MOCKED.** `create-invoice` returns fake `scheme://qpay?...` deeplinks and a
  1×1 base64 QR; `dev-sim-pay` flips `paid_at`. Real QPay V2 webhook is Phase 2.
- 🟡 **ДАН identity — MOCKED.** `packages/api/src/mocks/dan.ts` (`mockDANVerification`); routes set
  `dan_verified=true` without a real ДАН call.
- 🟡 **OTP (forgot-password / contact verify) — MOCKED.** Codes logged to server console only.
- 🟡 **Photo storage — LOCAL DISK.** Before/after photos written under `uploads/orders/:id/` and
  served at `/uploads/...` (≤5MB, JPEG/PNG/WebP). No cloud/object storage yet.

---

## 8. Process / workflow conventions

- **API route order is fixed:** Zod parse → `requireAuth()`/`requireAdmin()` → ownership check →
  logic. Response shape is always `{ success: true, data }` or `{ success: false, error }`
  (Mongolian message). Never leak stack traces / DB errors / Better Auth internals.
- **Enforcement hooks** (`.claude/hooks/`) block commits violating: missing `requireAuth`,
  exposed errors, worker-phone leak, `router.push` in screens, wrong cookie, TS errors, raw hex /
  wrong Tailwind tokens, dead code / legacy JWT.
- **Skills** (`.claude/skills/`) gate UI design tokens, API patterns, Postgres conventions,
  security redaction, Mongolian i18n, SOS performance, state-machine navigation — read the
  matching skill before editing that area.
- **Agent workflow:** after implementation, run `code-reviewer`, then `ui-ux-tester` at
  localhost:3000; fix criticals before "done."
- **Parameterized SQL only.** Soft-delete, never hard-delete. No `any`, ES modules, strict TS.
- **Dev:** `pnpm dev` (all) / `pnpm dev:api|web|admin`. `docker compose up --build` for web+db.
  Typecheck: `pnpm typecheck` (per-package `tsc --noEmit`).

---

## 9. Roadmap (phases)

- **MVP (now):** cleaning only (`area`/`unit`), charge-immediately escrow, instant + scheduled
  matching, worker onboarding + admin verification, disputes, SOS, reviews, in-app chat.
  Better Auth email/password + Google/Facebook.
- **Phase 2:** inspection / survey / repair services — authorize-then-capture escrow with
  `order_quotes` deltas (needs QPay V2 delta re-auth confirmation); real QPay webhook; real ДАН
  integration; real SMS OTP; cloud photo storage.
- **Planned Sprint 4.1 (housekeeping):** remove dead `packages/web/lib/db/` (third Pool + seed)
  and finish consolidating admin into `packages/admin`; reconcile the duplicate `pricing.ts`.
- **Pre-launch (legal):** finalize PDPL consent copy and policy text in
  `packages/web/lib/legal-content.ts` (currently placeholder — needs хуулийн зөвлөгөө).

---

### Doc-vs-code mismatches found
1. **ДАН+police AND-gate is NOT code-enforced** — admin approve sets `is_active=true` with no DAN/police check; docs say both are required before activation (procedural only).
2. **"SOS = no blocking logic ever" is violated** — `POST /api/sos` awaits a `sos_alerts` INSERT on the response path; only notifications are async.
3. **Urgent surcharge is effectively disabled** — `urgent_fee_multiplier=0` / `urgent_surcharge=0.0`, yet UI hints "+20%".
4. **"Single page, no routing" is partial** — `packages/web` still ships legacy routed `app/(auth)/*` and `app/admin/*` pages alongside the `page.tsx` state machine; admin exists in two places.
5. **Rounding & duplication** — pricing uses `Math.round` but payout split uses `Math.floor`; `pricing.ts` and `db/schema.ts` are duplicated across `packages/api` and `packages/web` (web `lib/db` is dead, pending Sprint 4.1).
