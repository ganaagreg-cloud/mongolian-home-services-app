'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginScreen } from '@/components/login-screen'

type LoginResponse =
  | { success: true }
  | { success: false; needsVerification?: true; phone?: string; error?: string }

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (email: string, password: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json()) as LoginResponse

      if (data.success) {
        router.push('/')
        return
      }

      if (!data.success && data.needsVerification && data.phone) {
        await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: data.phone }),
        })
        router.push(`/otp?phone=${encodeURIComponent(data.phone)}`)
        return
      }

      setError(data.error ?? 'Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.')
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneLogin = async (phone: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        setError(data.error ?? 'OTP илгээхэд алдаа гарлаа.')
        return
      }
      router.push(`/otp?phone=${encodeURIComponent(phone)}`)
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <LoginScreen
        onLogin={handleLogin}
        onPhoneLogin={handlePhoneLogin}
        onRegister={() => router.push('/register')}
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
