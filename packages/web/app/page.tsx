'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

type MeData = {
  needsOnboarding: boolean
  isWorker: boolean
  activeMode: string
}

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    fetch(`${api}/api/auth/me`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : { success: false })
      .then((json: { success: boolean; data?: MeData }) => {
        if (!json.success || !json.data) { router.replace('/login'); return }
        const { data } = json
        if (data.needsOnboarding) { router.replace('/onboarding'); return }
        if (data.isWorker && data.activeMode === 'worker') { router.replace('/jobs'); return }
        router.replace('/home')
      })
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
