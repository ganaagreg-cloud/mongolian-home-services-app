'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

export default function Verify2FAPage() {
  const [code,    setCode]    = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) { setError('6 оронт код оруулна уу'); return }

    setError('')
    setLoading(true)
    try {
      const res = await authClient.twoFactor.verifyTotp({ code })
      if (res.error) {
        setError('Код буруу байна. Дахин оролдоно уу.')
        return
      }
      window.location.href = '/'
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-[390px] space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">2FA баталгаажуулалт</h1>
          <p className="text-sm text-muted-foreground">
            Authenticator апп-аас 6 оронт кодыг оруулна уу
          </p>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-14 rounded-2xl border-border bg-card text-center text-2xl tracking-widest shadow-sm"
            autoFocus
          />

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Шалгаж байна…' : 'Баталгаажуулах'}
          </Button>
        </form>
      </div>
    </div>
  )
}
