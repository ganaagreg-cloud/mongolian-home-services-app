'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OAuthOnboardingScreen } from '@/components/oauth-onboarding-screen'

export default function OnboardingPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    fetch(`${api}/api/auth/me`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((json: { success: boolean; data?: { needsOnboarding: boolean } } | null) => {
        if (!json?.data) { router.replace('/login'); return }
        if (!json.data.needsOnboarding) { router.replace('/'); return }
        setReady(true)
      })
      .catch(() => router.replace('/login'))
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-[390px]">
      <OAuthOnboardingScreen onComplete={() => { window.location.href = '/' }} />
    </main>
  )
}
