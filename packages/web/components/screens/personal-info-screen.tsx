'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin, Check, ShieldCheck, ShieldOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch'
import { useSession } from '@/context/session-context'
import { authClient } from '@/lib/auth-client'
import { QRCodeSVG } from 'qrcode.react'

type MeData = {
  name: string; email: string; phone: string
  phoneVerified: boolean; emailVerified: boolean; isGoogleOAuth: boolean
  twoFactorEnabled: boolean
}

type TwoFactorStep = 'idle' | 'password' | 'qr' | 'disabling'

export function PersonalInfoScreen() {
  const router = useRouter()
  const session = useSession()
  const [name,              setName]              = useState(session?.name ?? '')
  const [email,             setEmail]             = useState('')
  const [localPhone,        setLocalPhone]        = useState('')
  const [birthDate,         setBirthDate]         = useState('1990-01-15')
  const [address,           setAddress]           = useState('Улаанбаатар, Сүхбаатар дүүрэг')
  const [saving,            setSaving]            = useState(false)
  const [error,             setError]             = useState('')
  const [phoneVerified,     setPhoneVerified]     = useState(false)
  const [emailVerified,     setEmailVerified]     = useState(false)
  const [isGoogleOAuth,     setIsGoogleOAuth]     = useState(false)
  const [sendingOtp,        setSendingOtp]        = useState<'phone' | 'email' | null>(null)
  const [twoFactorEnabled,  setTwoFactorEnabled]  = useState(false)
  const [tfStep,            setTfStep]            = useState<TwoFactorStep>('idle')
  const [tfPassword,        setTfPassword]        = useState('')
  const [tfTotpUri,         setTfTotpUri]         = useState('')
  const [tfVerifyCode,      setTfVerifyCode]      = useState('')
  const [tfLoading,         setTfLoading]         = useState(false)

  useEffect(() => {
    apiFetch('/api/me')
      .then((r) => r.json())
      .then((json: { success: boolean; data?: MeData }) => {
        if (json.success && json.data) {
          setName(json.data.name || '')
          setEmail(json.data.email)
          setLocalPhone(json.data.phone || '')
          setPhoneVerified(json.data.phoneVerified)
          setEmailVerified(json.data.emailVerified)
          setIsGoogleOAuth(json.data.isGoogleOAuth)
          setTwoFactorEnabled(json.data.twoFactorEnabled)
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (name.trim())  body.name  = name.trim()
      if (email.trim()) body.email = email.trim()

      const res = await apiFetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json() as { success: boolean; error?: string }
      if (!json.success) {
        setError(json.error ?? 'Алдаа гарлаа')
      } else {
        toast.success('Мэдээлэл амжилттай хадгалагдлаа')
      }
    } catch {
      setError('Алдаа гарлаа')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyPhone = async () => {
    setSendingOtp('phone')
    try {
      const res = await apiFetch('/api/me/send-verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'phone' }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? 'Алдаа гарлаа')
        return
      }
      router.push(`/settings/verify-otp?type=phone&contact=${encodeURIComponent(localPhone)}`)
    } catch {
      toast.error('Алдаа гарлаа')
    } finally {
      setSendingOtp(null)
    }
  }

  const handleVerifyEmail = async () => {
    setSendingOtp('email')
    try {
      const res = await apiFetch('/api/me/send-verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'email' }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        toast.error(data.error ?? 'Алдаа гарлаа')
        return
      }
      router.push(`/settings/verify-otp?type=email&contact=${encodeURIComponent(email)}`)
    } catch {
      toast.error('Алдаа гарлаа')
    } finally {
      setSendingOtp(null)
    }
  }

  const handleEnable2FA = async () => {
    if (!tfPassword) return
    setTfLoading(true)
    try {
      const res = await authClient.twoFactor.enable({ password: tfPassword })
      if (res.error) { toast.error('Нууц үг буруу байна'); return }
      setTfTotpUri(res.data?.totpURI ?? '')
      setTfPassword('')
      setTfVerifyCode('')
      setTfStep('qr')
    } catch {
      toast.error('Алдаа гарлаа')
    } finally {
      setTfLoading(false)
    }
  }

  const handleVerify2FACode = async () => {
    if (tfVerifyCode.length !== 6) return
    setTfLoading(true)
    try {
      const res = await authClient.twoFactor.verifyTotp({ code: tfVerifyCode })
      if (res.error) { toast.error('Код буруу байна. Дахин оролдоно уу.'); return }
      setTwoFactorEnabled(true)
      setTfStep('idle')
      setTfTotpUri('')
      toast.success('2FA амжилттай идэвхжүүллээ')
    } catch {
      toast.error('Алдаа гарлаа')
    } finally {
      setTfLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!tfPassword) return
    setTfLoading(true)
    try {
      const res = await authClient.twoFactor.disable({ password: tfPassword })
      if (res.error) { toast.error('Нууц үг буруу байна'); return }
      setTwoFactorEnabled(false)
      setTfStep('idle')
      setTfPassword('')
      toast.success('2FA идэвхгүй болголоо')
    } catch {
      toast.error('Алдаа гарлаа')
    } finally {
      setTfLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Хувийн мэдээлэл</h1>
      </div>

      {/* Avatar */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
            {name[0]}
          </AvatarFallback>
        </Avatar>
        <button className="text-sm font-medium text-primary active:scale-95 transition-all">
          Зураг солих
        </button>
      </div>

      {/* Form */}
      <div className="mt-6 space-y-4 px-6">
        {/* Name */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Нэр</p>
          <div className="relative">
            <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-2xl border-border bg-card pl-11 shadow-sm text-foreground"
            />
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Утасны дугаар</p>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localPhone}
              disabled
              className="h-12 rounded-2xl border-border bg-muted pl-11 shadow-sm text-muted-foreground"
            />
          </div>
          {phoneVerified ? (
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success">
                <Check className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-xs font-medium text-success">Баталгаажсан</span>
            </div>
          ) : localPhone ? (
            <button
              onClick={() => { void handleVerifyPhone() }}
              disabled={sendingOtp === 'phone'}
              className="text-xs font-semibold text-primary active:scale-95 transition-all disabled:opacity-50"
            >
              {sendingOtp === 'phone' ? 'Илгээж байна...' : 'Баталгаажуулах →'}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Утасны дугаар өөрчлөх боломжгүй</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Имэйл</p>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="h-12 rounded-2xl border-border bg-card pl-11 shadow-sm text-foreground"
            />
          </div>
          {isGoogleOAuth ? (
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success">
                <Check className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-xs font-medium text-success">Google-ээр баталгаажсан</span>
            </div>
          ) : emailVerified ? (
            <div className="flex items-center gap-1.5">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-success">
                <Check className="h-2.5 w-2.5 text-white" />
              </div>
              <span className="text-xs font-medium text-success">Баталгаажсан</span>
            </div>
          ) : email ? (
            <button
              onClick={() => { void handleVerifyEmail() }}
              disabled={sendingOtp === 'email'}
              className="text-xs font-semibold text-primary active:scale-95 transition-all disabled:opacity-50"
            >
              {sendingOtp === 'email' ? 'Илгээж байна...' : 'Баталгаажуулах →'}
            </button>
          ) : null}
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Төрсөн огноо</p>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              type="date"
              className="h-12 rounded-2xl border-border bg-card pl-11 shadow-sm text-foreground"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Хаяг</p>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-12 rounded-2xl border-border bg-card pl-11 shadow-sm text-foreground"
            />
          </div>
        </div>

        {/* 2FA */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {twoFactorEnabled
                ? <ShieldCheck className="h-5 w-5 text-success" />
                : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
              <div>
                <p className="text-sm font-semibold text-foreground">Хоёр хүчин зүйлийн баталгаажуулалт</p>
                <p className="text-xs text-muted-foreground">
                  {twoFactorEnabled ? 'Идэвхтэй' : 'Идэвхгүй'}
                </p>
              </div>
            </div>
            {tfStep === 'idle' && (
              <button
                onClick={() => setTfStep(twoFactorEnabled ? 'disabling' : 'password')}
                className="text-xs font-semibold text-primary active:scale-95 transition-all"
              >
                {twoFactorEnabled ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
              </button>
            )}
          </div>

          {tfStep === 'password' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Нууц үгээ оруулна уу</p>
              <Input
                type="password"
                value={tfPassword}
                onChange={(e) => setTfPassword(e.target.value)}
                placeholder="Нууц үг"
                className="h-10 rounded-xl border-border bg-background text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => { void handleEnable2FA() }}
                  disabled={tfLoading || !tfPassword}
                  size="sm"
                  className="flex-1 rounded-xl"
                >
                  {tfLoading ? 'Уншиж байна…' : 'Үргэлжлүүлэх'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTfStep('idle'); setTfPassword('') }}
                  className="rounded-xl"
                >
                  Буцах
                </Button>
              </div>
            </div>
          )}

          {tfStep === 'qr' && tfTotpUri && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Authenticator апп-аа нээж QR кодыг уншина уу
              </p>
              <div className="flex justify-center rounded-xl bg-white p-3">
                <QRCodeSVG value={tfTotpUri} size={180} />
              </div>
              <p className="text-xs text-muted-foreground">Апп дээрх 6 оронт кодыг оруулна уу</p>
              <Input
                value={tfVerifyCode}
                onChange={(e) => setTfVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="h-10 rounded-xl border-border bg-background text-center text-lg tracking-widest"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => { void handleVerify2FACode() }}
                  disabled={tfLoading || tfVerifyCode.length !== 6}
                  size="sm"
                  className="flex-1 rounded-xl"
                >
                  {tfLoading ? 'Шалгаж байна…' : 'Баталгаажуулах'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTfStep('idle'); setTfTotpUri(''); setTfVerifyCode('') }}
                  className="rounded-xl"
                >
                  Буцах
                </Button>
              </div>
            </div>
          )}

          {tfStep === 'disabling' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">2FA идэвхгүй болгохын тулд нууц үгээ оруулна уу</p>
              <Input
                type="password"
                value={tfPassword}
                onChange={(e) => setTfPassword(e.target.value)}
                placeholder="Нууц үг"
                className="h-10 rounded-xl border-border bg-background text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => { void handleDisable2FA() }}
                  disabled={tfLoading || !tfPassword}
                  size="sm"
                  variant="destructive"
                  className="flex-1 rounded-xl"
                >
                  {tfLoading ? 'Уншиж байна…' : 'Идэвхгүй болгох'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTfStep('idle'); setTfPassword('') }}
                  className="rounded-xl"
                >
                  Буцах
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* DAN Badge */}
        <div className="rounded-2xl bg-success/10 p-4 shadow-sm">
          <p className="text-sm font-semibold text-success">ДАН баталгаажсан</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Таны мэдээлэл Монгол улсын үндэсний цахим системээр баталгаажсан байна
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={() => { void handleSave() }}
          disabled={saving}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? 'Хадгалж байна…' : 'Хадгалах'}
        </Button>
      </div>
    </div>
  )
}
