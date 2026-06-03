'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin-sidebar'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Auth gate runs client-side: the admin session cookie is scoped to the API
// origin (separate Render service), so it can never be read from this app's
// own request cookies. Instead we verify with the API via credentials:include —
// the browser sends the API-origin cookie back to the API. 401/403 → /login.
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`${BASE}/api/admin/me`, { credentials: 'include', cache: 'no-store' })
      .then(r => (r.ok ? r.json() : { success: false }))
      .then((d: { success: boolean }) => {
        if (d.success) {
          setAuthed(true)
        } else {
          setAuthed(false)
          router.replace('/login')
        }
      })
      .catch(() => {
        setAuthed(false)
        router.replace('/login')
      })
  }, [router])

  if (authed !== true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pb-8">{children}</main>
    </div>
  )
}
