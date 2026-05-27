# App Architecture — Non-Negotiable Rules

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
