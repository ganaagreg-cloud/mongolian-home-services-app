'use client'

import { useState } from 'react'
import { Phone, Lock, Eye, EyeOff, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { normalizePhone, validateMongolianPhone } from '@/lib/phone'

interface OAuthOnboardingScreenProps {
  onComplete: () => void
}

export function OAuthOnboardingScreen({ onComplete }: OAuthOnboardingScreenProps) {
  const [phone,       setPhone]       = useState('')
  const [addPassword, setAddPassword] = useState(false)
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const phoneValid = validateMongolianPhone(normalizePhone(phone))
  const canSubmit  = !loading && phoneValid && (!addPassword || password.length >= 8)

  const handleSubmit = async () => {
    setError('')
    const normalized = normalizePhone(phone)
    if (!validateMongolianPhone(normalized)) {
      setError('Утасны дугаар буруу байна (8 оронтой, 8x эсвэл 9x-ээр эхэлнэ)')
      return
    }
    setLoading(true)
    try {
      const body: Record<string, string> = { phone: normalized }
      if (addPassword && password.length >= 8) body.password = password

      const res = await fetch('/api/me', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        setError(data.error ?? 'Алдаа гарлаа')
      } else {
        onComplete()
      }
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-32">
      {/* Header */}
      <div className="flex flex-col items-center pt-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Утасны дугаар</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Захиалга хийхэд утасны дугаар шаардлагатай.{'\n'}Нэг удаа оруулахад болно.
        </p>
      </div>

      <div className="mt-10 space-y-4">
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

        {/* Optional password toggle */}
        <button
          onClick={() => { setAddPassword((v) => !v); setPassword('') }}
          className="flex w-full items-center justify-between rounded-2xl bg-card p-4 shadow-sm active:scale-95 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Нууц үг тохируулах</p>
              <p className="text-xs text-muted-foreground">Утасны дугаараар нэвтрэх боломжтой болно</p>
            </div>
          </div>
          <div className={`h-6 w-11 rounded-full transition-colors ${addPassword ? 'bg-primary' : 'bg-muted'}`}>
            <div className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${addPassword ? 'translate-x-5.5 ml-0.5' : 'ml-0.5'}`} />
          </div>
        </button>

        {addPassword && (
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
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={() => { void handleSubmit() }}
          disabled={!canSubmit}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Хадгалж байна...' : 'Үргэлжлүүлэх'}
        </Button>
      </div>
    </div>
  )
}
