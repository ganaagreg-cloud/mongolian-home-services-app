import { type NextRequest, NextResponse } from 'next/server'

// UX redirect only — sends unauthenticated browsers to /login early.
// Does NOT grant access based on role. Authorization lives in:
//   - app/(app)/layout.tsx and app/(worker)/layout.tsx (server auth gates via Hono /api/auth/me)
//   - All Hono API handlers (requireAuth / requireAdmin)
//
// CROSS-ORIGIN GUARD: When the API runs on a different origin than the web app
// (Render split services; localhost :3000 ↔ :4000), Better Auth scopes the
// session cookie to the API origin, so the web origin NEVER receives
// `better-auth.session_token`. There, cookie-absence does NOT mean "logged out"
// — it means "unknowable here". Redirecting on absence bounces a freshly
// authenticated user straight back to /login, aborting the in-flight page
// request (net::ERR_ABORTED on /). So we defer entirely to the client
// dispatcher (app/page.tsx) + server layouts, which auth via credentials:include.
function apiIsSameOrigin(request: NextRequest): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return true // no API origin configured → assume same-origin
  try {
    return new URL(apiUrl).host === request.nextUrl.host
  } catch {
    return true
  }
}

export function middleware(request: NextRequest) {
  // Cross-origin API: the session cookie is invisible to this origin. The edge
  // cannot tell logged-in from logged-out here — let the client + layouts decide.
  if (!apiIsSameOrigin(request)) {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('better-auth.session_token')

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the intended destination so the login page can redirect after auth (M2+)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - /login, /register (public auth pages)
     * - /onboarding (public)
     * - /api/* (Hono handles its own auth)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /manifest.json, /sw.js, /icon*, /apple-icon* (static assets)
     */
    '/((?!login|register|onboarding|api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon|apple-icon|offline).*)',
  ],
}
