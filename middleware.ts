import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Routes that don't require a session
const AUTH_ROUTES = ['/onboarding', '/login', '/otp', '/dan-success']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('token')?.value
  const session = token ? await verifyToken(token) : null

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/onboarding', req.url))
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run on all routes except API routes, Next.js internals, and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
