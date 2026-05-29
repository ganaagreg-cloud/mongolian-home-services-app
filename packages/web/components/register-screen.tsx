'use client'

import { useState } from 'react'
import { ArrowLeft, User, Phone, Lock, Eye, EyeOff } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { apiFetch } from '@/lib/api-fetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizePhone, validateMongolianPhone, phoneToEmail } from '@/lib/phone'

interface RegisterScreenProps {
  onGoLogin: () => void
}

export function RegisterScreen({ onGoLogin }: RegisterScreenProps) {
  const [firstName,       setFirstName]       = useState('')
  const [lastName,        setLastName]        = useState('')
  const [phone,           setPhone]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw,          setShowPw]          = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')

  const canSubmit =
    !loading &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phone.length === 8 &&
    password.length >= 8 &&
    confirmPassword.length >= 8

  const handleSubmit = async () => {
    setError('')
    const normalized = normalizePhone(phone)
    if (!validateMongolianPhone(normalized)) {
      setError('Утасны дугаар буруу байна (8 оронтой, 8x эсвэл 9x-ээр эхэлнэ)')
      return
    }
    if (password !== confirmPassword) {
      setError('Нууц үг таарахгүй байна')
      return
    }
    setLoading(true)
    try {
      const email = phoneToEmail(normalized)
      const name = `${firstName} ${lastName}`
      
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name,
      })
      
      if (signUpError) {
        setError('Бүртгэл үүсгэхэд алдаа гарлаа')
      } else {
        // Update phone + name breakdown after signup
        try {
          const updateRes = await apiFetch('/api/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: normalized }),
          })
          const updateData = await updateRes.json() as { success: boolean }
          if (updateData.success || updateRes.ok) {
            window.location.reload()
          } else {
            setError('Профиль шинэчлэхэд алдаа гарлаа')
          }
        } catch {
          // Even if phone update fails, account is created + cookie is set
          window.location.reload()
        }
      }
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
          onClick={onGoLogin}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Бүртгүүлэх</h1>
      </div>

      <div className="mt-6 space-y-4 px-6">
        {/* Name row */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Нэр</p>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Нэр"
                value={firstName}
                onChange={(e) => { setError(''); setFirstName(e.target.value) }}
                className="h-12 rounded-2xl border-border bg-card pl-9 shadow-sm text-foreground"
              />
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Овог</p>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Овог"
                value={lastName}
                onChange={(e) => { setError(''); setLastName(e.target.value) }}
                className="h-12 rounded-2xl border-border bg-card pl-9 shadow-sm text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Утасны дугаар</p>
          <div className="flex gap-2">
            <div className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-card px-4 shadow-sm">
              <span className="text-sm font-medium text-foreground">+976</span>
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                inputMode="numeric"
                placeholder="99001234"
                value={phone}
                onChange={(e) => { setError(''); setPhone(e.target.value.replace(/\D/g, '').slice(0, 8)) }}
                className="h-12 w-full rounded-2xl border-border bg-card pl-9 shadow-sm text-foreground"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Нууц үг (хамгийн багадаа 8 тэмдэгт)</p>
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

        {/* Confirm password */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Нууц үг давтах</p>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => { setError(''); setConfirmPassword(e.target.value) }}
              className="h-12 rounded-2xl border-border bg-card pl-11 pr-11 shadow-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-95 transition-all"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Нэвтрэх link */}
      <div className="mt-6 text-center">
        <span className="text-sm text-muted-foreground">Бүртгэлтэй юу? </span>
        <button
          onClick={onGoLogin}
          className="text-sm font-semibold text-primary active:scale-95 transition-all"
        >
          Нэвтрэх
        </button>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={() => { void handleSubmit() }}
          disabled={!canSubmit}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Бүртгэж байна...' : 'Бүртгүүлэх'}
        </Button>
      </div>
    </div>
  )
}
