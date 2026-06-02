import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SessionProvider, type SessionData } from '@/context/session-context'
import { AppBottomNav } from '@/components/app-bottom-nav'
import { ModeToggle } from '@/components/mode-toggle'
import { WorkerModeHintToast } from '@/components/worker-mode-hint-toast'

// ONE authoritative server → Hono call per navigation for the user app group.
// Pages within this layout fetch their own data client-side via fetcher() / browserClient.
async function getSession(cookieHeader: string): Promise<SessionData | null> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  try {
    const res = await fetch(`${apiBase}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const json = (await res.json()) as { success: boolean; data?: SessionData }
    return json.success && json.data ? json.data : null
  } catch {
    return null
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = await getSession(cookieStore.toString())

  if (!session) redirect('/login')

  return (
    <SessionProvider initialData={session}>
      <Suspense>
        <WorkerModeHintToast />
      </Suspense>
      <main className="mx-auto max-w-[390px] min-h-screen bg-background">
        {children}
      </main>
      <ModeToggle />
      <AppBottomNav />
    </SessionProvider>
  )
}
