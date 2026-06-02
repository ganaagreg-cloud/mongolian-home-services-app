'use client'

import { useState } from 'react'
import { LoginScreen } from '@/components/login-screen'
import { RegisterScreen } from '@/components/register-screen'
import { ForgotPasswordScreen } from '@/components/forgot-password-screen'
import { OtpVerifyScreen } from '@/components/otp-verify-screen'
import { PinResetScreen } from '@/components/pin-reset-screen'

type AuthView = 'login' | 'register' | 'forgot' | 'otp' | 'pin-reset'

export default function LoginPage() {
  const [view, setView] = useState<AuthView>('login')
  const [forgotPhone, setForgotPhone] = useState('')
  const [resetToken, setResetToken] = useState('')

  return (
    <main className="mx-auto max-w-[390px]">
      {view === 'register' && (
        <RegisterScreen onGoLogin={() => setView('login')} />
      )}
      {view === 'forgot' && (
        <ForgotPasswordScreen
          onBack={() => setView('login')}
          onOtpSent={(phone) => { setForgotPhone(phone); setView('otp') }}
        />
      )}
      {view === 'otp' && (
        <OtpVerifyScreen
          phone={forgotPhone}
          onBack={() => setView('forgot')}
          onVerified={(token) => { setResetToken(token); setView('pin-reset') }}
        />
      )}
      {view === 'pin-reset' && (
        <PinResetScreen
          resetToken={resetToken}
          onBack={() => setView('login')}
          onSuccess={() => setView('login')}
        />
      )}
      {view === 'login' && (
        <LoginScreen
          onGoRegister={() => setView('register')}
          onForgotPassword={() => setView('forgot')}
        />
      )}
    </main>
  )
}
