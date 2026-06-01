'use client'

import { useState } from 'react'
import { Home, Phone, Eye, EyeOff, Lock } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizePhone, validateMongolianPhone, phoneToEmail } from '@/lib/phone'

// Brand SVGs — exception to lucide-only rule for OAuth provider identity
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

interface LoginScreenProps {
  onGoRegister:    () => void
  onForgotPassword?: () => void
}

export function LoginScreen({ onGoRegister, onForgotPassword }: LoginScreenProps) {
  const [phone,       setPhone]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState<'phone' | 'google' | 'facebook' | null>(null)
  const [error,       setError]       = useState('')

  const handlePhoneLogin = async () => {
    setError('')
    const normalized = normalizePhone(phone)
    if (!validateMongolianPhone(normalized)) {
      setError('Утасны дугаар буруу байна (8 оронтой, 8x эсвэл 9x-ээр эхэлнэ)')
      return
    }
    if (!password) {
      setError('Нууц үгийг оруулна уу')
      return
    }
    setLoading('phone')
    try {
      const { error } = await authClient.signIn.email({
        email: phoneToEmail(normalized),
        password,
      })
      if (error) {
        setError('Утасны дугаар эсвэл нууц үг буруу байна')
      } else {
        window.location.reload()
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(null)
    }
  }

  const handleGoogle = () => {
    setLoading('google')
    void authClient.signIn.social({ provider: 'google', callbackURL: '/' })
  }

  const handleFacebook = () => {
    setLoading('facebook')
    void authClient.signIn.social({ provider: 'facebook', callbackURL: '/' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6">
      {/* Logo */}
      <div className="flex flex-col items-center pt-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Home className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">HomeService</h1>
        <p className="mt-1 text-sm text-muted-foreground">Гэрийн Үйлчилгээ</p>
      </div>

      {/* Phone + password form */}
      <div className="mt-10 space-y-4">
        {/* Phone */}
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

        {/* Password */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Нууц үг</p>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setError(''); setPassword(e.target.value) }}
              className="h-12 rounded-2xl border-border bg-card pl-11 pr-11 shadow-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-95 transition-all"
            >
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={() => { void handlePhoneLogin() }}
          disabled={!!loading}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading === 'phone' ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
        </Button>

        {onForgotPassword && (
          <div className="text-center">
            <button
              onClick={onForgotPassword}
              className="text-sm font-semibold text-primary active:scale-95 transition-all"
            >
              Нэвтрэх нэр мартсан уу?
            </button>
          </div>
        )}
      </div>

      {/* OR divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-sm text-muted-foreground">эсвэл</span>
        </div>
      </div>

      {/* Social buttons */}
      <div className="flex flex-col gap-3">
        <Button
          onClick={handleGoogle}
          disabled={!!loading}
          className="h-14 w-full rounded-2xl border border-border bg-background text-base font-semibold text-foreground shadow-sm hover:bg-card active:scale-95 transition-all disabled:opacity-50"
        >
          {loading === 'google' ? (
            'Нэвтрэж байна...'
          ) : (
            <span className="flex items-center gap-3">
              <GoogleIcon />
              Google-ээр нэвтрэх
            </span>
          )}
        </Button>

        <Button
          onClick={handleFacebook}
          disabled={!!loading}
          style={{ backgroundColor: '#1877F2' }}
          className="h-14 w-full rounded-2xl text-base font-semibold text-white shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading === 'facebook' ? (
            'Нэвтрэж байна...'
          ) : (
            <span className="flex items-center gap-3">
              <FacebookIcon />
              Facebook-ээр нэвтрэх
            </span>
          )}
        </Button>
      </div>

      {/* Register link */}
      <div className="mb-12 mt-6 text-center">
        <span className="text-sm text-muted-foreground">Бүртгэлгүй юу? </span>
        <button
          onClick={onGoRegister}
          className="text-sm font-semibold text-primary active:scale-95 transition-all"
        >
          Бүртгүүлэх
        </button>
      </div>
    </div>
  )
}
