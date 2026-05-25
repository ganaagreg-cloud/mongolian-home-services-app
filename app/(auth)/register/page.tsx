'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RegisterScreen } from '@/components/register-screen'
import type { RegisterFields } from '@/components/register-screen'

type RegisterResponse = { success: boolean; error?: string }

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (fields: Omit<RegisterFields, 'confirmPassword'>) => {
    setError(null)
    setLoading(true)
    try {
      // 1. Create account (is_verified: false)
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const registerData = (await registerRes.json()) as RegisterResponse
      if (!registerData.success) {
        setError(registerData.error ?? 'Бүртгэхэд алдаа гарлаа. Дахин оролдоно уу.')
        return
      }

      // 2. Send OTP to verify phone
      const otpRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fields.phone }),
      })
      const otpData = (await otpRes.json()) as { success: boolean; error?: string }
      if (!otpData.success) {
        setError(otpData.error ?? 'SMS илгээхэд алдаа гарлаа. Дахин оролдоно уу.')
        return
      }

      // 3. Redirect to OTP verification
      router.push(`/otp?phone=${encodeURIComponent(fields.phone)}`)
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <RegisterScreen
        onSubmit={handleSubmit}
        onBack={() => router.push('/login')}
        loading={loading}
      />
      {error && (
        <div className="fixed bottom-24 left-4 right-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive shadow-md">
          {error}
        </div>
      )}
    </div>
  )
}
