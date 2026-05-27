import { NextResponse } from 'next/server'

// This endpoint is no longer used. Authentication is now handled by:
// 1. authClient.signIn.email() for login (client-side)
// 2. /api/auth/[...all]/route.ts (Better Auth handler) for OAuth callbacks

// Keeping this file as a placeholder to avoid 404s during migration.
// Delete this file once confident the new auth flow is stable.

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use authClient.signIn.email() instead.' },
    { status: 410 },
  )
}
