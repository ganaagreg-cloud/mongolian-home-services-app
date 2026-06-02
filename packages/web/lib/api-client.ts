import type { AppType } from '@homeservices/api'
import { hc } from 'hono/client'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/**
 * Server-side client: pass cookies().toString() from next/headers.
 * Each call uses cache: 'no-store' — auth gates must always be fresh.
 */
export function createServerClient(cookieHeader: string) {
  return hc<AppType>(API_BASE, {
    headers: { cookie: cookieHeader },
    init: { cache: 'no-store' },
  })
}

/**
 * Browser-side singleton: browser auto-sends the session cookie.
 * Use for client component data fetches as an alternative to fetcher().
 */
export const browserClient = hc<AppType>(API_BASE, {
  init: { credentials: 'include' },
})
