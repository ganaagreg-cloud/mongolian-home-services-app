# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev           # All packages in parallel (Turbo)
pnpm dev:api       # Hono API server only (localhost:4000, tsx watch)
pnpm dev:web       # Next.js web app only (localhost:3000, Turbopack)
pnpm dev:admin     # Admin panel only (port TBD — package not yet wired)
pnpm build         # Production build (all packages)
pnpm lint          # ESLint (all packages)
pnpm typecheck     # TypeScript check (all packages)
pnpm exec tsc --noEmit   # Run inside packages/api or packages/web for single-package check

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

## Architecture Decisions — Read First

Before ANY change to auth, routing, or middleware:
→ Read `.claude/decisions/auth.md`

Before ANY change to app/page.tsx, API routes, or DB:
→ Read `.claude/decisions/architecture.md`

Violations are caught by hooks and will block execution.

## Skills — Read Before Acting

| Task | Read first |
|------|-----------|
| Any UI / component work | `.claude/skills/production-ui-design/` |
| Any API route | `.claude/skills/api-route-pattern/` |
| Any DB query or migration | `.claude/skills/postgres-conventions/` |
| Auth, tokens, logging | `.claude/skills/security-redaction/` |
| Mongolian strings / i18n | `.claude/skills/mongolian-i18n/` |
| SOS or any < 2s endpoint | `.claude/skills/sos-performance/` |
| Screen transitions / nav | `.claude/skills/state-machine-navigation/` |

## Agent Workflow

After completing any implementation:
1. Use `code-reviewer` agent to review changed files
2. Use `ui-ux-tester` agent to verify affected screens at localhost:3000
3. Fix critical issues before considering done

## Hooks — Enforced Automatically

| Hook | Catches |
|------|---------|
| `api-security-lint.sh` | Missing requireAuth, exposed errors, worker phone leak |
| `business-rules-lint.sh` | Middleware redirects, wrong cookie, router.push in screens |
| `typecheck-gate.sh` | TypeScript errors |
| `ui-token-lint.sh` | Wrong Tailwind classes, raw hex colors |
| `dead-code-lint.sh` | Unused imports, legacy JWT, deprecated endpoint calls |

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

Turborepo monorepo: `packages/api` is a Hono + Node.js API server (port 4000); `packages/web` is a Next.js 16 App Router frontend (port 3000); `packages/admin` is a future admin panel (TBD); `packages/shared` holds shared TypeScript types. The UI layer in packages/web is a client-side state machine; the data layer is PostgreSQL (via `pg` Pool) in Docker. Auth is Google/Facebook OAuth via Better Auth (session cookies, issued by packages/api).

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
packages/web/
  app/page.tsx                # Single-page entry; owns all shared state
  components/
    screens/                  # 25 full-screen views (one per Screen value)
    ui/                       # shadcn/ui + Radix UI primitives (do not edit)
    bottom-nav.tsx            # User tab bar
    worker-bottom-nav.tsx
    login-screen.tsx  onboarding-screen.tsx  otp-screen.tsx
    register-screen.tsx  dan-success-screen.tsx  sos-button.tsx
  hooks/
    use-mobile.ts             # 768px breakpoint detector
    use-toast.ts
  lib/
    auth.ts                   # Better Auth client-side config (web only)
    auth-client.ts            # Better Auth browser client (useSession, signOut, signIn.social)
    types.ts                  # shared TypeScript types (UserRole, Screen, OrderStatus, …)
    utils.ts                  # cn() = clsx + tailwind-merge

packages/api/src/
  index.ts                    # Hono app entry — CORS middleware, route mounts, server start
  auth.ts                     # Better Auth instance + requireAuth(c) + requireAdmin(c)
  db.ts                       # pg Pool singleton
  db/schema.ts                # CREATE TABLE IF NOT EXISTS DDL (PostgreSQL)
  db/seed.ts                  # dev seed data (workers, orders, banking info)
  routes/
    auth.ts                   # /api/auth/* catch-all + /api/auth/me + /api/auth/dan
    me.ts                     # GET/PATCH /api/me — profile + mode toggle
    orders.ts                 # /api/orders — CRUD, match, accept, decline, upload, review
    workers.ts                # /api/workers — list, register, [id], me, availability, banking
    admin.ts                  # /api/admin — stats, disputes, worker verification
    payments.ts               # /api/payments — create-invoice (QPay V2 mock), dev-sim-pay
    sos.ts                    # /api/sos — emergency alert (< 2s)
    disputes.ts               # /api/disputes — dispute management
    service-types.ts          # /api/service-types — master data
```

## Key Technical Facts

- **Monorepo:** pnpm workspaces + Turborepo; packages: api, web, admin, shared
- **packages/api:** Hono + @hono/node-server, TypeScript via tsx, port 4000; no Next.js
- **packages/web:** Next.js 16.2.6 App Router + Turbopack, no `src/` directory
- **Tailwind CSS 4** (packages/web) — `@import "tailwindcss"` in globals.css, NOT the v3 `@tailwind` directives
- **Path alias:** `@/*` → `packages/web/` root (tsconfig.json inside packages/web)
- **Package manager:** pnpm
- **TypeScript strict mode** in all packages

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

Docker Compose injects `DATABASE_URL` automatically for the `api` service. For local non-Docker dev:

`packages/api/.env` (server-side only, never exposed to browser):
```
DATABASE_URL=postgresql://postgres:mongolia_secure_pass@localhost:5432/homeservices
BETTER_AUTH_SECRET=<64-char hex>
BETTER_AUTH_URL=http://localhost:4000   # must be the API origin, used for OAuth callbacks
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
FACEBOOK_CLIENT_ID=<from Meta for Developers>
FACEBOOK_CLIENT_SECRET=<from Meta for Developers>
DAN_CLIENT_ID=
DAN_CLIENT_SECRET=
QPAY_API_KEY=
JWT_SECRET=        # legacy fallback — only used by remaining jose helpers
PORT=4000
CORS_ORIGIN=http://localhost:3000  # comma-separated for multiple origins
```

`packages/web/.env.local` (Next.js; NEXT_PUBLIC_* are exposed to browser):
```
NEXT_PUBLIC_API_URL=http://localhost:4000   # points to packages/api
BETTER_AUTH_URL=http://localhost:4000       # must match packages/api BETTER_AUTH_URL
```

`packages/admin` — no environment variables yet (package not wired)

## Engineering Principles

### 1. Think Before Coding
State assumptions explicitly. If multiple interpretations exist, present them — don't pick silently. If a simpler approach exists, say so. If something is unclear, stop and ask.

### 2. Simplicity First
Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No error handling for impossible scenarios. If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes
Touch only what you must. Don't improve adjacent code or formatting. Match existing style. When your changes create orphaned imports/variables, remove them — but don't remove pre-existing dead code unless asked.

### 4. Goal-Driven Execution
Transform vague tasks into verifiable goals before starting. For multi-step tasks, state a brief plan with verify steps. Don't claim "done" until each step actually passes.
