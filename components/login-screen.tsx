'use client'

import { useState } from 'react'
import { Smartphone, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void
  onRegister: () => void
  loading?: boolean
}

export function LoginScreen({ onLogin, onRegister, loading = false }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const canSubmit = email.includes('@') && password.length > 0 && !loading

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      {/* Logo */}
      <div className="flex flex-col items-center pt-12">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Smartphone className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">HomeService</h1>
        <p className="mt-1 text-sm text-muted-foreground">Гэрийн үйлчилгээний платформ</p>
      </div>

      {/* Form */}
      <div className="mt-12 flex flex-1 flex-col gap-4">
        {/* Email */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Цахим хаяг
          </label>
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            autoCapitalize="none"
            autoCorrect="off"
            className="h-12 rounded-2xl border-border bg-card text-foreground shadow-sm placeholder:text-muted-foreground"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">
            Нууц үг
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-2xl border-border bg-card pr-12 text-foreground shadow-sm placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Нуух' : 'Харуулах'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Login CTA */}
        <Button
          onClick={() => onLogin(email, password)}
          disabled={!canSubmit}
          className="mt-2 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? 'Нэвтрэж байна...' : 'Нэвтрэх'}
        </Button>

        {/* Divider */}
        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-sm text-muted-foreground">эсвэл</span>
          </div>
        </div>

        {/* Register */}
        <Button
          onClick={onRegister}
          variant="outline"
          className="h-14 w-full rounded-2xl border-border bg-card text-base font-semibold text-foreground shadow-sm hover:bg-card/80 active:scale-95 transition-all"
        >
          Бүртгүүлэх
        </Button>
      </div>
    </div>
  )
}
