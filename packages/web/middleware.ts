import { type NextRequest, NextResponse } from 'next/server'

// UX redirect only — sends unauthenticated browsers to /login early.
// Does NOT grant access based on role. Authorization lives in:
//   - app/(app)/layout.tsx and app/(worker)/layout.tsx (server auth gates via Hono /api/auth/me)
//   - All Hono API handlers (requireAuth / requireAdmin)
export function middleware(request: NextRequest) {
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
