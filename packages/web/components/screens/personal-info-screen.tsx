'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Phone, Mail, Calendar, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-fetch'

interface PersonalInfoScreenProps {
  userName: string
  phone: string
  onBack: () => void
}

export function PersonalInfoScreen({ userName, phone, onBack }: PersonalInfoScreenProps) {
  const [name, setName] = useState(userName)
  const [email, setEmail] = useState('')
  const [birthDate, setBirthDate] = useState('1990-01-15')
  const [address, setAddress] = useState('Улаанбаатар, Сүхбаатар дүүрэг')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/me')
      .then((r) => r.json())
      .then((json: { success: boolean; data?: { name: string; email: string } }) => {
        if (json.success && json.data) {
          setName(json.data.name || userName)
          setEmail(json.data.email)
        }
      })
      .catch(() => {})
  }, [userName])

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

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
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
              value={phone}
              disabled
              className="h-12 rounded-2xl border-border bg-muted pl-11 shadow-sm text-muted-foreground"
            />
          </div>
          <p className="text-xs text-muted-foreground">Утасны дугаар өөрчлөх боломжгүй</p>
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

        {/* DAN Badge */}
        <div className="rounded-2xl bg-success/10 p-4 shadow-sm">
          <p className="text-sm font-semibold text-success">ДАН баталгаажсан</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Таны мэдээлэл Монгол улсын үндэсний цахим системээр баталгаажсан байна
          </p>
        </div>

        {/* Inline error */}
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
