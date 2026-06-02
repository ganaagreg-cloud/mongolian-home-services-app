import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SessionProvider, type SessionData } from '@/context/session-context'
import { AppWorkerBottomNav } from '@/components/app-worker-bottom-nav'

// ONE authoritative server → Hono call per navigation for the worker flow group.
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

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const session = await getSession(cookieStore.toString())

  if (!session) redirect('/login')
  // Non-workers trying to access /jobs → send to /home
  if (!session.isWorker) redirect('/home')

  return (
    <SessionProvider initialData={session}>
      <main className="mx-auto max-w-[390px] min-h-screen bg-background">
        {children}
      </main>
      <AppWorkerBottomNav />
    </SessionProvider>
  )
}
