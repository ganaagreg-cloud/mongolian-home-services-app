# Auth Architecture — Non-Negotiable Rules

## Single source of truth
- ONLY useSession() in app/page.tsx controls auth routing
- NEVER check auth in middleware — infinite redirect loops guaranteed
- NEVER redirect in middleware (proxy.ts passes everything through)
- ALWAYS use authClient.* client methods for auth actions
- NEVER call auth.api.* server methods from custom route handlers

## Three auth states — exactly three
- unauthenticated  → show login or register screen
- needs-profile    → show oauth-onboarding (phone is null)
- authenticated    → route by role + active_mode

## What causes ERR_TOO_MANY_REDIRECTS
- Middleware redirecting unauthenticated users
- Custom auth endpoints that don't set cookies
- Any redirect chain longer than: action → home

## Session cookies
- Better Auth sets cookies via /api/auth/[...all] automatically
- Never read better-auth.session_token directly
- Never set auth cookies in custom API routes

## Forbidden patterns
- req.cookies.get('token') — wrong cookie, legacy JWT
- verifyToken() — legacy, removed
- /api/auth/login or /api/auth/register — deprecated (410)
- router.push('/login') from any screen
