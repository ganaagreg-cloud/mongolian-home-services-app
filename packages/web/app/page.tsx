import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

type MeData = {
  isWorker: boolean
  activeMode: 'user' | 'worker'
  needsOnboarding: boolean
}

async function resolveDestination(cookieHeader: string): Promise<string> {
  const apiBase = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  try {
    const res = await fetch(`${apiBase}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (!res.ok) return '/login'
    const json = (await res.json()) as { success: boolean; data?: MeData }
    if (!json.success || !json.data) return '/login'

    const { data } = json
    if (data.needsOnboarding) return '/login'
    if (data.isWorker && data.activeMode === 'worker') return '/jobs'
    return '/home'
  } catch {
    return '/login'
  }
}

// Server-side dispatcher: the single entry point that routes to the right
// App Router segment based on session state.
// - No session → /login (middleware catches this first, but gate here too)
// - Worker in worker mode → /jobs
// - Everyone else → /home
export default async function RootPage() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const destination = await resolveDestination(cookieHeader)
  redirect(destination)
}
