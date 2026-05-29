'use client'

import { useEffect, useState } from 'react'
import AdminSidebar from '@/components/admin-sidebar'
import BlockedState from '@/components/blocked-state'
import { Skeleton } from '@/components/ui/skeleton'

type AuthState = 'loading' | 'blocked' | 'admin'

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>('loading')

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    fetch(`${base}/api/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then((data: { user?: { role?: string } }) => {
        setAuth(data?.user?.role === 'admin' ? 'admin' : 'blocked')
      })
      .catch(() => setAuth('blocked'))
  }, [])

  if (auth === 'loading') {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="w-64 shrink-0 space-y-4 border-r border-border bg-card p-6">
          <Skeleton className="h-8 w-40 rounded-2xl" />
          <div className="space-y-2 pt-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-6 p-8">
          <Skeleton className="h-8 w-48 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (auth === 'blocked') {
    return <BlockedState />
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pb-8">{children}</main>
    </div>
  )
}
