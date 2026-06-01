'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export interface OtpContext {
  purpose: 'verify-phone' | 'verify-email'
  contactValue: string
}

interface OtpVerifyScreenProps {
  phone:      string
  onBack:     () => void
  onVerified: (resetToken: string) => void
  otpContext?: OtpContext
}

const RESEND_SECONDS = 60

function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at < 0) return email
  const local = email.slice(0, at)
  const domain = email.slice(at)
  return local.slice(0, 2) + '••••' + domain
}

export function OtpVerifyScreen({ phone, onBack, onVerified, otpContext }: OtpVerifyScreenProps) {
  const [code,      setCode]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [resending, setResending] = useState(false)
  const [error,     setError]     = useState('')
  const [countdown, setCountdown] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const isEmail   = otpContext?.purpose === 'verify-email'
  const contact   = otpContext?.contactValue ?? phone
  const masked    = isEmail ? maskEmail(contact) : contact.slice(0, 2) + '••••' + contact.slice(-2)
  const suffix    = isEmail ? 'хаягт' : 'дугаарт'

  const title = otpContext
    ? isEmail ? 'Имэйл баталгаажуулалт' : 'Утас баталгаажуулалт'
    : 'OTP баталгаажуулалт'

  const handleVerify = async () => {
    if (code.length !== 6) return
    setError('')
    setLoading(true)
    try {
      if (otpContext) {
        // Contact verification mode — authenticated endpoint
        const res  = await apiFetch('/api/me/verify-contact', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ type: isEmail ? 'email' : 'phone', code }),
        })
        const data = await res.json() as { success: boolean; error?: string }
        if (!res.ok || !data.success) {
          setError(data.error ?? 'Код буруу эсвэл хугацаа дууссан')
          setCode('')
          return
        }
        onVerified('')
      } else {
        // Forgot-password mode — no-session endpoint
        const res  = await apiFetch('/api/auth/verify-otp', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ phone, code }),
        })
        const data = await res.json() as { success: boolean; resetToken?: string; error?: string }
        if (!res.ok || !data.resetToken) {
          setError(data.error ?? 'Код буруу эсвэл хугацаа дууссан')
          setCode('')
          return
        }
        onVerified(data.resetToken)
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setCode('')
    setResending(true)
    try {
      if (otpContext) {
        await apiFetch('/api/me/send-verify-otp', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ type: isEmail ? 'email' : 'phone' }),
        })
      } else {
        await apiFetch('/api/auth/forgot-password', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ phone }),
        })
      }
      setCountdown(RESEND_SECONDS)
    } catch {
      setError('Дахин илгээхэд алдаа гарлаа')
    } finally {
      setResending(false)
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
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>

      <div className="mt-6 px-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{masked}</span> {suffix} илгээсэн
          6 оронтой кодыг оруулна уу.
        </p>
      </div>

      {/* OTP input */}
      <div className="mt-10 flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(val) => { setError(''); setCode(val) }}
        >
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="h-14 w-12 rounded-2xl border-border bg-card text-xl font-bold shadow-sm first:rounded-2xl last:rounded-2xl"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {error && <p className="mt-4 px-6 text-center text-sm text-destructive">{error}</p>}

      {/* Resend */}
      <div className="mt-6 text-center">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            Дахин илгээх боломжтой болно: {countdown}с
          </p>
        ) : (
          <button
            onClick={() => { void handleResend() }}
            disabled={resending}
            className="text-sm font-semibold text-primary active:scale-95 transition-all disabled:opacity-50"
          >
            {resending ? 'Илгээж байна...' : 'Дахин илгээх'}
          </button>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={() => { void handleVerify() }}
          disabled={code.length !== 6 || loading}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Шалгаж байна...' : 'Баталгаажуулах'}
        </Button>
      </div>
    </div>
  )
}
