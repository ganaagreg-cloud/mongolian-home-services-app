import { NextRequest, NextResponse } from 'next/server'

// Routes that are part of the auth flow (OAuth callbacks, etc.)
const AUTH_ROUTES = ['/onboarding', '/login', '/register', '/otp', '/dan-success']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  // For auth routes, just pass through to Next.js
  // The routes themselves handle redirects (e.g., /login redirects to /)
  if (isAuthRoute) {
    return NextResponse.next()
  }

  // For all other routes, pass through to Next.js
  // The app/page.tsx (single-page app) will handle auth logic via useSession()
  return NextResponse.next()
}

export const config = {
  // Run on all routes except API routes, Next.js internals, and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
