'use client'

import { useState } from 'react'
import { ArrowLeft, Phone } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizePhone, validateMongolianPhone } from '@/lib/phone'

interface ForgotPasswordScreenProps {
  onBack: () => void
  onOtpSent: (phone: string) => void
}

export function ForgotPasswordScreen({ onBack, onOtpSent }: ForgotPasswordScreenProps) {
  const [phone,   setPhone]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const normalized = normalizePhone(phone)
  const canSubmit  = !loading && validateMongolianPhone(normalized)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const res  = await apiFetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: normalized }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Алдаа гарлаа')
        return
      }
      onOtpSent(normalized)
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Нууц үг сэргээх</h1>
      </div>

      <div className="mt-6 px-6">
        <p className="text-sm text-muted-foreground">
          Бүртгэлтэй утасны дугаараа оруулна уу. OTP код илгээнэ.
        </p>
      </div>

      <div className="mt-6 space-y-4 px-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Утасны дугаар</p>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              inputMode="numeric"
              placeholder="99001234"
              value={phone}
              onChange={(e) => { setError(''); setPhone(e.target.value.replace(/\D/g, '').slice(0, 8)) }}
              className="h-12 rounded-2xl border-border bg-card pl-11 shadow-sm text-foreground"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={() => { void handleSubmit() }}
          disabled={!canSubmit}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Илгээж байна...' : 'OTP код илгээх'}
        </Button>
      </div>
    </div>
  )
}
