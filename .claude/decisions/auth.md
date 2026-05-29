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
- Better Auth sets cookies via /api/auth/* automatically — handled by packages/api
- Never read better-auth.session_token directly
- Never set auth cookies in custom API routes

## OAuth callback origin
- BETTER_AUTH_URL in packages/api must equal the API origin (http://localhost:4000 in dev, https://api.homeservice.mn in prod)
- OAuth provider redirect URIs must point to the API origin: {BETTER_AUTH_URL}/api/auth/callback/{provider}
- The Next.js frontend (packages/web) must set BETTER_AUTH_URL to the same API origin so authClient routes requests correctly

## Cross-subdomain cookie decision
- Dev (localhost): cookies are shared by hostname regardless of port; no special cookie domain needed
- Prod: Better Auth is configured with `advanced.crossSubDomainCookies.enabled: true` and `domain: .homeservice.mn`; cookies set with `SameSite=None; Secure` so they are sent from app.homeservice.mn → api.homeservice.mn
- This decision lives in packages/api/src/auth.ts — do not duplicate in packages/web

## Forbidden patterns
- req.cookies.get('token') or getCookie(c, 'token') — wrong cookie, legacy JWT (packages/web and packages/api both)
- verifyToken() — legacy, removed
- /api/auth/login or /api/auth/register — deprecated (410)
- router.push('/login') from any screen in packages/web
