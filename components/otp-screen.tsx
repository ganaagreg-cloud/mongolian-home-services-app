'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

interface OTPScreenProps {
  phone: string
  onBack: () => void
  onVerify: (otp: string) => void
  onResend?: () => void | Promise<void>
}

export function OTPScreen({ phone, onBack, onVerify, onResend }: OTPScreenProps) {
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const handleResend = async () => {
    setCountdown(60)
    setCanResend(false)
    setOtp('')
    await onResend?.()
  }

  const handleVerify = () => {
    if (otp.length === 6) {
      onVerify(otp)
    }
  }

  const maskedPhone = `+976 ${phone.slice(0, 2)}** **${phone.slice(-2)}`

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-sm hover:bg-card/80 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">{maskedPhone}</span>
      </div>

      {/* Content */}
      <div className="mt-16 flex flex-col items-center">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Баталгаажуулах код</h1>
        <p className="mb-10 text-center text-sm text-muted-foreground">
          Таны утсанд илгээсэн 6 оронтой кодыг оруулна уу
        </p>

        {/* OTP Input */}
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          containerClassName="gap-3"
        >
          <InputOTPGroup className="gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="h-14 w-12 rounded-2xl border-border bg-card text-lg font-semibold text-foreground shadow-sm first:rounded-2xl last:rounded-2xl"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {/* Timer and resend */}
        <div className="mt-8 text-center">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-sm font-medium text-primary hover:underline"
            >
              Дахин илгээх
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Дахин илгээх{' '}
              <span className="font-semibold text-foreground">{countdown}с</span>
            </p>
          )}
        </div>
      </div>

      {/* Verify button */}
      <div className="mt-auto pb-4">
        <Button
          onClick={handleVerify}
          disabled={otp.length < 6}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-50"
        >
          Баталгаажуулах
        </Button>
      </div>
    </div>
  )
}
