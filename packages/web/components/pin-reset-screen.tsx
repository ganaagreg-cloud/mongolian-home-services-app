'use client'

import { useState } from 'react'
import { ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api-fetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PinResetScreenProps {
  resetToken: string
  onBack:     () => void
  onSuccess:  () => void
}

export function PinResetScreen({ resetToken, onBack, onSuccess }: PinResetScreenProps) {
  const [pin,        setPin]        = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPin,    setShowPin]    = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [succeeded,  setSucceeded]  = useState(false)

  const pinOk     = pin.length >= 8
  const matchOk   = pin === confirm && confirm.length > 0
  const canSubmit = !loading && pinOk && matchOk

  const handleReset = async () => {
    setError('')
    setLoading(true)
    try {
      const res  = await apiFetch('/api/auth/reset-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resetToken, pin }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.')
        return
      }
      setSucceeded(true)
    } catch {
      setError('Сүлжээний алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  if (succeeded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <Check className="h-10 w-10 text-success" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">Амжилттай!</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Нууц үг амжилттай солигдлоо. Шинэ нууц үгээрээ нэвтэрнэ үү.
        </p>
        <Button
          onClick={onSuccess}
          className="mt-8 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
        >
          Нэвтрэх хуудас руу буцах
        </Button>
      </div>
    )
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
        <h1 className="text-xl font-bold text-foreground">Шинэ нууц үг тохируулах</h1>
      </div>

      <div className="mt-6 px-6">
        <p className="text-sm text-muted-foreground">
          Хамгийн багадаа 8 тэмдэгт агуулсан шинэ нууц үг үүсгэнэ үү.
        </p>
      </div>

      <div className="mt-6 space-y-4 px-6">
        {/* New PIN */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Шинэ нууц үг</p>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPin ? 'text' : 'password'}
              placeholder="••••••••"
              value={pin}
              onChange={(e) => { setError(''); setPin(e.target.value) }}
              className="h-12 rounded-2xl border-border bg-card pl-11 pr-11 shadow-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPin((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-95 transition-all"
            >
              {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {pin.length > 0 && !pinOk && (
            <p className="text-xs text-destructive">Хамгийн багадаа 8 тэмдэгт шаардлагатай</p>
          )}
        </div>

        {/* Confirm PIN */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Нууц үг давтах</p>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showConf ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => { setError(''); setConfirm(e.target.value) }}
              className="h-12 rounded-2xl border-border bg-card pl-11 pr-11 shadow-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => setShowConf((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-95 transition-all"
            >
              {showConf ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {confirm.length > 0 && pin !== confirm && (
            <p className="text-xs text-destructive">Нууц үг таарахгүй байна</p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={() => { void handleReset() }}
          disabled={!canSubmit}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Хадгалж байна...' : 'Хадгалах'}
        </Button>
      </div>
    </div>
  )
}
