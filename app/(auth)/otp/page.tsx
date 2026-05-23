'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OTPScreen } from '@/components/otp-screen'

function OTPPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') ?? ''
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async (otp: string) => {
    setError(null)
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    })
    const data = (await res.json()) as { success: boolean; error?: string }
    if (data.success) {
      router.push('/')
    } else {
      setError(data.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.')
    }
  }

  return (
    <div className="relative">
      <OTPScreen phone={phone} onBack={() => router.push('/login')} onVerify={handleVerify} />
      {error && (
        <div className="fixed bottom-6 left-4 right-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive shadow-md">
          {error}
        </div>
      )}
    </div>
  )
}

export default function OTPPage() {
  return (
    <Suspense>
      <OTPPageInner />
    </Suspense>
  )
}
