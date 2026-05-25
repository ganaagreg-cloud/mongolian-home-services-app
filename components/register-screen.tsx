'use client'

import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface RegisterFields {
  firstName:       string
  lastName:        string
  email:           string
  phone:           string
  password:        string
  confirmPassword: string
}

interface RegisterScreenProps {
  onSubmit: (fields: Omit<RegisterFields, 'confirmPassword'>) => void
  onBack: () => void
  loading?: boolean
}

const EMPTY: RegisterFields = {
  firstName: '', lastName: '',
  email: '', phone: '', password: '', confirmPassword: '',
}

export function RegisterScreen({ onSubmit, onBack, loading = false }: RegisterScreenProps) {
  const [fields, setFields] = useState<RegisterFields>(EMPTY)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  const set = (key: keyof RegisterFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = () => {
    if (fields.password !== fields.confirmPassword) {
      setPwError('Нууц үг таарахгүй байна.')
      return
    }
    setPwError(null)
    const { confirmPassword: _, ...rest } = fields
    onSubmit(rest)
  }

  const canSubmit =
    !loading &&
    fields.firstName.trim().length > 0 &&
    fields.lastName.trim().length > 0 &&
    fields.email.includes('@') &&
    fields.phone.replace(/\D/g, '').length === 8 &&
    fields.password.length >= 8 &&
    fields.confirmPassword.length >= 8

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
          aria-label="Буцах"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Бүртгүүлэх</h1>
      </div>

      {/* Fields */}
      <div className="mt-6 flex flex-col gap-4 px-6">

        {/* First Name + Last Name row */}
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Нэр <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Нэр"
              value={fields.firstName}
              onChange={set('firstName')}
              className="h-12 rounded-2xl border-border bg-card shadow-sm placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-sm font-medium text-foreground">
              Овог <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Овог"
              value={fields.lastName}
              onChange={set('lastName')}
              className="h-12 rounded-2xl border-border bg-card shadow-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Цахим хаяг <span className="text-destructive">*</span>
          </label>
          <Input
            type="email"
            placeholder="name@example.com"
            value={fields.email}
            onChange={set('email')}
            className="h-12 rounded-2xl border-border bg-card shadow-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Утасны дугаар <span className="text-destructive">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-card px-4 shadow-sm">
              <span className="text-sm font-medium text-foreground">+976</span>
            </div>
            <Input
              type="tel"
              placeholder="0000 0000"
              value={fields.phone}
              onChange={(e) =>
                setFields((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 8) }))
              }
              className="h-12 flex-1 rounded-2xl border-border bg-card shadow-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Нууц үг <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="Хамгийн багадаа 8 тэмдэгт"
              value={fields.password}
              onChange={set('password')}
              className="h-12 rounded-2xl border-border bg-card pr-12 shadow-sm placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPw ? 'Нуух' : 'Харуулах'}
            >
              {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Нууц үг давтах <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Нууц үгийг давтана уу"
              value={fields.confirmPassword}
              onChange={set('confirmPassword')}
              className="h-12 rounded-2xl border-border bg-card pr-12 shadow-sm placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? 'Нуух' : 'Харуулах'}
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {pwError && (
            <p className="text-sm font-medium text-destructive">{pwError}</p>
          )}
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Бүртгэж байна...' : 'Бүртгүүлэх'}
        </Button>
      </div>
    </div>
  )
}
