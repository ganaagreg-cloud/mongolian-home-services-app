'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { OtpVerifyScreen } from '@/components/otp-verify-screen'

export default function VerifyOtpPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const type    = searchParams.get('type') ?? 'phone'
  const contact = searchParams.get('contact') ?? ''

  return (
    <OtpVerifyScreen
      phone={contact}
      otpContext={{
        purpose:      type === 'email' ? 'verify-email' : 'verify-phone',
        contactValue: contact,
      }}
      onBack={() => router.back()}
      onVerified={() => router.replace('/settings')}
    />
  )
}
