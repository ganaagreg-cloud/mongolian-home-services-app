# App Architecture — Non-Negotiable Rules

## Monorepo structure

| Package | Responsibility | Port |
|---------|---------------|------|
| packages/api | Hono API server — all routes, Better Auth, DB access | 4000 |
| packages/web | Next.js 16 App Router — UI only, calls packages/api | 3000 |
| packages/admin | Standalone Next.js admin panel | 3001 |
| packages/shared | Shared TypeScript types only — no runtime code | — |

**Enforced rules:**
- `packages/web` must NOT contain an `app/api/` directory — all API logic lives in packages/api
- `packages/admin` must NOT contain an `app/api/` directory — same reason
- packages/web and packages/admin fetch data from packages/api over HTTP; they never import DB or auth server code directly
- BETTER_AUTH_URL must always equal the packages/api origin (not the web origin)
- Note: `packages/web/app/admin/` contains legacy admin Next.js routes inside the web app. New admin work goes in `packages/admin` only.

## Navigation
- Single page: app/page.tsx
- Navigation = setCurrentScreen(screen: Screen) only
- NEVER use router.push(), <Link>, useRouter() in screens
- window.location.reload() only after auth state changes

## State ownership
- app/page.tsx owns all shared state
- Screens receive data via props only
- Screens NEVER fetch /api/auth/me themselves
- Session fetched once on mount in app/page.tsx

## API routes
- Order always: Zod → requireAuth() → ownership check → logic
- Never skip or reorder these steps
- Response shape: { success: true, data: T } or { error: string }
- Never expose stack traces, DB errors, Better Auth internals
- Generic Mongolian error messages for auth failures only

## Worker phone protection
- Worker phone NEVER in any client-facing API response
- Applies to: orders, worker cards, search results, chat

## File hygiene
- Delete code you replace — not just stop using it
- If Better Auth replaces a custom endpoint → delete the file
- If a screen is replaced → delete the old component file
- Remove unused imports and state variables in the same session
- No TODO comments left in committed code

## Database
- Never hard-delete users or workers (soft delete via deleted_at)
- Money = integers in MNT, never floats
- Parameterized queries only — never string concatenation
## Self-matching prevention
- Matching algorithm always excludes workers.user_id = orders.user_id
- /api/orders/:id/accept returns 403 if worker is the order creator
- Never remove this check — it prevents escrow fraud
## Worker availability vs activation
- is_active = admin approved this worker (only admin can set)
- is_available = worker is open to new jobs (worker sets this)
- Matching algorithm requires BOTH: is_active=true AND is_available=true
- Never let workers set their own is_active