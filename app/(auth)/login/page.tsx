'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginScreen } from '@/components/login-screen'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleSendOTP = async (phone: string) => {
    setError(null)
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = (await res.json()) as { success: boolean; error?: string }
    if (data.success) {
      router.push(`/otp?phone=${encodeURIComponent(phone)}`)
    } else {
      setError(data.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.')
    }
  }

  const handleDANLogin = async () => {
    setError(null)
    const res = await fetch('/api/auth/dan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = (await res.json()) as { success: boolean; error?: string }
    if (data.success) {
      router.push('/dan-success')
    } else {
      setError(data.error ?? 'ДАН системтэй холбогдоход алдаа гарлаа.')
    }
  }

  return (
    <div className="relative">
      <LoginScreen onSendOTP={handleSendOTP} onDANLogin={handleDANLogin} />
      {error && (
        <div className="fixed bottom-6 left-4 right-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive shadow-md">
          {error}
        </div>
      )}
    </div>
  )
}
