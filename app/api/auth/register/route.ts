import { NextResponse } from 'next/server'

// This endpoint is no longer used. Authentication is now handled by:
// 1. authClient.signUp.email() for registration (client-side)
// 2. authClient.signIn.email() for login (client-side)
// 3. /api/auth/[...all]/route.ts (Better Auth handler) for OAuth callbacks
// 4. /api/me PATCH for phone/profile updates (after auth is established)

// Keeping this file as a placeholder to avoid 404s during migration.
// Delete this file once confident the new auth flow is stable.

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use authClient.signUp.email() instead.' },
    { status: 410 },
  )
}
