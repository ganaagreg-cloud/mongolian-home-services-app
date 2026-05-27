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

## MCP Servers

| Server | Purpose |
|--------|---------|
| Playwright | Visual testing, screenshots, browser automation — target `http://localhost:3000` |
| Context7 | Up-to-date library docs (Next.js, Tailwind, shadcn, Zod) |
| GitHub | PR/issue management, repo operations |

## Testing Workflows

### User Flow Testing
- Login: Google/Facebook OAuth button → Better Auth callback → home screen
- Worker registration: profile → "Ажилтнаар бүртгүүлэх" → DAN + police clearance → admin approves → `is_worker=true`
- Mode toggle: home screen segmented control (Хэрэглэгч / Ажилтан) — only visible when `is_worker=true`
- Booking: search → worker card → date/time → payment → confirmation
- Admin: pending verifications → approve/reject → dispute resolution

### Login Flow
1. Open `http://localhost:3000`
2. Click "Google-ээр нэвтрэх" or "Facebook-ээр нэвтрэх"
3. Complete OAuth flow — redirects back to app
4. App calls `/api/auth/me` and routes: admin → admin screen, worker mode → worker-jobs, else → home

### API Integration Testing
- Session cookie set by Better Auth (`better-auth.session_token`)
- Verify Zod validation rejects malformed input with 400
- Verify unauthenticated requests to protected routes return 401

## Architecture

Full-stack Next.js 16 App Router app. The UI layer is a client-side state machine; the data layer is PostgreSQL (via `pg` Pool) in Docker. Auth is Google/Facebook OAuth via Better Auth (session cookies).

### Navigation: State Machine, Not Next.js Routing

The entire app lives in a single page (`app/page.tsx`). Navigation is driven by `currentScreen` state of type `Screen` (~20 string literals). Every transition is `setCurrentScreen(...)`. No `<Link>` or `router.push()` anywhere.

`app/page.tsx` owns all shared state (`isWorker`, `activeMode`, `currentScreen`, `hasActiveBooking`) and passes callbacks down as props.

### Two Roles + Worker Mode

`UserRole = 'user' | 'admin'`

Workers are **users** with `is_worker = true` in the DB. They switch modes via a segmented toggle (stored as `active_mode = 'user' | 'worker'`).

- **user mode** — home, search, booking, active-booking, review, profile, orders, chat
- **worker mode** (requires `is_worker=true`) — worker-jobs, worker-active, worker-earnings, worker-profile
- **admin** — admin, admin-verify, admin-disputes

### Component Organization

```
components/
  screens/          # 25 full-screen views (one per Screen value)
  ui/               # shadcn/ui + Radix UI primitives (do not edit)
  bottom-nav.tsx    # User tab bar
  worker-bottom-nav.tsx
  login-screen.tsx  onboarding-screen.tsx  otp-screen.tsx
  register-screen.tsx  dan-success-screen.tsx  sos-button.tsx
hooks/
  use-mobile.ts     # 768px breakpoint detector
  use-toast.ts
lib/
  auth.ts           # Better Auth instance + requireAuth() + legacy JWT helpers
  auth-client.ts    # Better Auth client (authClient.useSession, signOut, signIn.social)
  types.ts          # shared TypeScript types (UserRole, Screen, OrderStatus, …)
  utils.ts          # cn() = clsx + tailwind-merge
lib/db/
  index.ts          # pg Pool singleton + schema init + seed on first boot
  schema.ts         # CREATE TABLE IF NOT EXISTS DDL (PostgreSQL)
  seed.ts           # dev seed data (workers, orders, banking info)
app/api/
  auth/[...all]/    # Better Auth catch-all (OAuth callbacks, session, signout)
  auth/me/          # GET — current user profile
  auth/dan/         # POST — DAN identity verification
  me/               # GET/PATCH — profile update
  me/mode/          # PATCH — toggle active_mode ('user'|'worker')
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
- Use `cn()` from `lib/utils.ts` for all className composition

## Environment Variables

Docker Compose injects `DATABASE_URL` automatically for the `web` service. For local non-Docker dev, create `.env.local`:

```
DATABASE_URL=postgresql://postgres:mongolia_secure_pass@localhost:5432/homeservices
BETTER_AUTH_SECRET=<64-char hex>
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
FACEBOOK_CLIENT_ID=<from Meta for Developers>
FACEBOOK_CLIENT_SECRET=<from Meta for Developers>
DAN_CLIENT_ID=
DAN_CLIENT_SECRET=
QPAY_API_KEY=
JWT_SECRET=        # legacy fallback — only used by remaining jose helpers
```

## Engineering Principles

### 1. Think Before Coding
State assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, say so. If something is unclear, stop and ask.

### 2. Simplicity First
Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No error handling for impossible scenarios. If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
Touch only what you must. Don't improve adjacent code or formatting. Match existing style. When your changes create orphaned imports/variables, remove them — but don't remove pre-existing dead code unless asked.

### 4. Goal-Driven Execution
Transform vague tasks into verifiable goals before starting. For multi-step tasks, state a brief plan with verify steps. Don't claim "done" until each step actually passes.
