'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import {
  UserCircle, HelpCircle, Shield, LogOut, BadgeCheck, Star, Briefcase,
  ToggleLeft, ToggleRight, Pencil, X, Check, Clock, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import type { BankingInfo, Worker } from '@/lib/types'

interface WorkerProfileScreenProps {
  workerName: string
  phone: string
  onMenuClick: (menu: string) => void
  onLogout: () => void
}

const BANKS = [
  'Хаан Банк', 'Голомт', 'ХХБ', 'Төрийн Банк',
  'Хас Банк', 'Капитрон', 'Үндэсний хөрөнгө оруулалт', 'Чингис Хаан Банк',
]

const IBAN_RE = /^MN\d{2}[A-Z0-9]{18}$/

function maskAccount(num: string) { return '****' + num.slice(-4) }
function formatIBAN(iban: string)  { return iban.match(/.{1,4}/g)?.join(' ') ?? iban }

function fieldError(field: string, value: string): string {
  switch (field) {
    case 'bankName':          return !value ? 'Банкны нэрийг сонгоно уу' : ''
    case 'accountNumber':     return !/^\d{10,20}$/.test(value) ? 'Дансны дугаар 10–20 оронтой тоо байх ёстой' : ''
    case 'accountHolderName': return value.trim().length < 3 ? 'Дансны эзний нэрийг оруулна уу (дор хаяж 3 тэмдэгт)' : ''
    case 'iban':              return !IBAN_RE.test(value) ? 'IBAN буруу формат байна. Жишээ: MN86XXXXXXXXXXXXXXXXXX' : ''
    default:                  return ''
  }
}

const menuItems = [
  { id: 'personal-info', icon: UserCircle, label: 'Хувийн мэдээлэл' },
  { id: 'help',          icon: HelpCircle, label: 'Тусламж' },
  { id: 'privacy',       icon: Shield,     label: 'Нууцлал' },
]

export function WorkerProfileScreen({ workerName, phone, onMenuClick, onLogout }: WorkerProfileScreenProps) {
  // ── Remote data ────────────────────────────────────────────────────────────
  const { data: workerData } = useSWR<Worker | null>(
    '/api/workers/me', fetcher, { shouldRetryOnError: false },
  )
  const {
    data: bankInfo,
    isLoading: bankLoading,
    mutate: mutateBank,
  } = useSWR<BankingInfo | null>('/api/workers/me/banking', fetcher)

  // ── Availability (optimistic) ──────────────────────────────────────────────
  const [isAvailable, setIsAvailable] = useState(true)
  useEffect(() => {
    if (workerData) setIsAvailable(workerData.isAvailable)
  }, [workerData])

  const toggleAvailability = async () => {
    const next = !isAvailable
    setIsAvailable(next)   // optimistic
    await fetch('/api/workers/me/availability', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: next }),
    })
  }

  // ── Banking edit form ──────────────────────────────────────────────────────
  const [isEditingBank, setIsEditingBank] = useState(false)
  const [editBank,   setEditBank]   = useState('')
  const [editAccount, setEditAccount] = useState('')
  const [editHolder,  setEditHolder]  = useState('')
  const [editIban,    setEditIban]    = useState('')
  const [editType, setEditType]       = useState<'checking' | 'savings'>('checking')
  const [touched,  setTouched]        = useState<Record<string, boolean>>({})
  const [saveLoading, setSaveLoading] = useState(false)

  const touch = (f: string) => setTouched((t) => ({ ...t, [f]: true }))

  const editValid =
    !!editBank &&
    /^\d{10,20}$/.test(editAccount) &&
    editHolder.trim().length >= 3 &&
    IBAN_RE.test(editIban)

  const openEdit = () => {
    setEditBank(bankInfo?.bankName ?? '')
    setEditAccount(bankInfo?.accountNumber ?? '')
    setEditHolder(bankInfo?.accountHolderName ?? '')
    setEditIban(bankInfo?.iban ?? '')
    setEditType(bankInfo?.accountType ?? 'checking')
    setTouched({})
    setIsEditingBank(true)
  }

  const cancelEdit = () => { setIsEditingBank(false); setTouched({}) }

  const saveEdit = async () => {
    setSaveLoading(true)
    try {
      const res = await fetch('/api/workers/me/banking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: editBank, accountNumber: editAccount,
          accountHolderName: editHolder, iban: editIban, accountType: editType,
        }),
      })
      const data = (await res.json()) as { success: boolean }
      if (data.success) {
        await mutateBank()
        setIsEditingBank(false)
        setTouched({})
      }
    } finally {
      setSaveLoading(false)
    }
  }

  // ── Derived display values ─────────────────────────────────────────────────
  const displayName   = workerData?.name ?? workerName
  const displayRating = workerData?.rating ?? 4.9
  const reviewCount   = workerData?.reviewCount ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Профайл</h1>
      </div>

      {/* Profile Card */}
      <div className="mx-6 mt-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
            {displayName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-foreground">{displayName}</p>
          <p className="text-sm text-muted-foreground">
            {phone || 'Утас нэмааг?й'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex items-center gap-1">
              <BadgeCheck className="h-4 w-4 text-success" />
              <span className="text-xs font-medium text-success">ДАН</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-xs font-medium text-foreground">{displayRating}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-6 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Гүйцэтгэсэн', value: String(reviewCount) },
          { label: 'Үнэлгээ',     value: String(displayRating) },
          { label: 'Орлого',      value: '₮485K' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-card p-3 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Availability Toggle */}
      <div className="mx-6 mt-4 flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isAvailable ? 'bg-success/10' : 'bg-muted'}`}>
            <Briefcase className={`h-5 w-5 ${isAvailable ? 'text-success' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="font-medium text-foreground">Ажлын горим</p>
            <p className={`text-xs font-medium ${isAvailable ? 'text-success' : 'text-muted-foreground'}`}>
              {isAvailable ? 'Ажил хүлээн авч байна' : 'Ажил хүлээн авахгүй'}
            </p>
          </div>
        </div>
        <button onClick={toggleAvailability} className="transition-all active:scale-95">
          {isAvailable
            ? <ToggleRight className="h-8 w-8 text-success" />
            : <ToggleLeft  className="h-8 w-8 text-muted-foreground" />}
        </button>
      </div>

      {/* Banking Section */}
      <div className="mx-6 mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Банкны мэдээлэл</h2>
          {!isEditingBank && !bankLoading && (
            <button
              onClick={openEdit}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-sm transition-colors hover:bg-card/80 active:scale-95"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {bankLoading && (
          <div className="rounded-2xl bg-card p-4 shadow-sm space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}

        {/* No banking info yet */}
        {!bankLoading && bankInfo === null && !isEditingBank && (
          <div className="rounded-2xl bg-card p-6 shadow-sm text-center">
            <p className="text-sm text-muted-foreground">Банкны мэдээлэл оруулаагүй байна</p>
            <Button
              onClick={openEdit}
              className="mt-3 h-11 rounded-2xl bg-primary px-6 text-sm font-semibold shadow-md"
            >
              Нэмэх
            </Button>
          </div>
        )}

        {/* Edit form */}
        {isEditingBank && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-xs text-destructive">
                Буруу мэдээлэл оруулвал төлбөр хүргүүлэхэд саатахыг анхааруулна
              </p>
            </div>

            <div className="space-y-4 rounded-2xl bg-card p-4 shadow-sm">
              {/* Bank name */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Банкны нэр</p>
                <div className="relative">
                  <select
                    value={editBank}
                    onChange={(e) => setEditBank(e.target.value)}
                    onBlur={() => touch('bankName')}
                    className="h-12 w-full appearance-none rounded-2xl border border-border bg-background px-4 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Банк сонгох...</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                {touched.bankName && fieldError('bankName', editBank) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('bankName', editBank)}</p>
                )}
              </div>

              {/* Account number */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Дансны дугаар</p>
                <Input
                  placeholder="1234567890"
                  inputMode="numeric"
                  value={editAccount}
                  onChange={(e) => setEditAccount(e.target.value.replace(/\D/g, '').slice(0, 20))}
                  onBlur={() => touch('accountNumber')}
                  className="h-12 rounded-2xl border-border bg-background font-mono shadow-sm"
                />
                {touched.accountNumber && fieldError('accountNumber', editAccount) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('accountNumber', editAccount)}</p>
                )}
              </div>

              {/* Account holder */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Дансны эзний нэр</p>
                <Input
                  placeholder="БАТБОЛД ДОРЖ"
                  value={editHolder}
                  onChange={(e) => setEditHolder(e.target.value.toUpperCase())}
                  onBlur={() => touch('accountHolderName')}
                  className="h-12 rounded-2xl border-border bg-background shadow-sm"
                />
                {touched.accountHolderName && fieldError('accountHolderName', editHolder) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('accountHolderName', editHolder)}</p>
                )}
              </div>

              {/* IBAN */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">IBAN</p>
                <Input
                  placeholder="MN86XXXXXXXXXXXXXXXXXX"
                  value={editIban}
                  onChange={(e) => setEditIban(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 22))}
                  onBlur={() => touch('iban')}
                  className="h-12 rounded-2xl border-border bg-background font-mono tracking-wider shadow-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">{editIban.length}/22 тэмдэгт</p>
                {touched.iban && fieldError('iban', editIban) && (
                  <p className="mt-1 text-xs text-destructive">{fieldError('iban', editIban)}</p>
                )}
              </div>

              {/* Account type */}
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Дансны төрөл</p>
                <div className="flex gap-3">
                  {([
                    { value: 'checking', label: 'Эргүүлэлтийн' },
                    { value: 'savings',  label: 'Хадгаламж' },
                  ] as const).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setEditType(type.value)}
                      className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-colors active:scale-95 ${
                        editType === type.value
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-background text-foreground shadow-sm'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit actions */}
            <div className="flex gap-3">
              <Button
                onClick={cancelEdit}
                variant="outline"
                className="h-12 flex-1 rounded-2xl border-border bg-card font-semibold shadow-sm"
              >
                <X className="mr-2 h-4 w-4" />
                Болих
              </Button>
              <Button
                onClick={saveEdit}
                disabled={!editValid || saveLoading}
                className="h-12 flex-1 rounded-2xl bg-primary font-semibold shadow-md disabled:opacity-50"
              >
                <Check className="mr-2 h-4 w-4" />
                {saveLoading ? 'Хадгалж байна...' : 'Хадгалах'}
              </Button>
            </div>
          </div>
        )}

        {/* Display mode */}
        {!bankLoading && bankInfo && !isEditingBank && (
          <div className="rounded-2xl bg-card p-4 shadow-sm">
            {bankInfo.verified ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2">
                <BadgeCheck className="h-4 w-4 shrink-0 text-success" />
                <p className="text-xs font-medium text-success">Баталгаажсан</p>
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2">
                <Clock className="h-4 w-4 shrink-0 text-accent" />
                <p className="text-xs font-medium text-accent">Админ баталгаажуулахыг хүлээж байна</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Банк</p>
                <p className="text-sm font-semibold text-foreground">{bankInfo.bankName}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Дансны дугаар</p>
                <p className="font-mono text-sm font-semibold text-foreground">{maskAccount(bankInfo.accountNumber)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Дансны эзэн</p>
                <p className="text-sm font-semibold text-foreground">{bankInfo.accountHolderName}</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">IBAN</p>
                <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-foreground">
                  {formatIBAN(bankInfo.iban)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Төрөл</p>
                <p className="text-sm font-semibold text-foreground">
                  {bankInfo.accountType === 'checking' ? 'Эргүүлэлтийн' : 'Хадгаламж'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="mx-6 mt-6 overflow-hidden rounded-2xl bg-card shadow-sm">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => onMenuClick(item.id)}
              className={`flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.98] ${
                index !== menuItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Logout */}
      <div className="mx-6 mt-4">
        <Button
          onClick={onLogout}
          variant="ghost"
          className="h-14 w-full rounded-2xl font-semibold text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Гарах
        </Button>
      </div>
    </div>
  )
}
