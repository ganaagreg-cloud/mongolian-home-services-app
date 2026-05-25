'use client'

import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, MapPin, Lock, Sparkles, Droplets,
  Zap, Wrench, Paintbrush, Wind, Home, Building2, Briefcase, Camera,
  Clock, CalendarDays, CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MatchingStrategy } from '@/lib/types'

interface CreateOrderScreenProps {
  onBack: () => void
  onOrderCreated: (orderId: string, strategy: MatchingStrategy, totalAmount: number) => void
}

const SERVICES = [
  { id: 'Цэвэрлэгээ',    label: 'Цэвэрлэгээ',   Icon: Sparkles,   rate: 25000, enabled: true  },
  { id: 'Сантехник',     label: 'Сантехник',    Icon: Droplets,   rate: 35000, enabled: false },
  { id: 'Цахилгаан',    label: 'Цахилгаан',   Icon: Zap,        rate: 40000, enabled: false },
  { id: 'Жижиг засвар', label: 'Жижиг засвар', Icon: Wrench,     rate: 30000, enabled: false },
  { id: 'Будаг',         label: 'Будаг',        Icon: Paintbrush, rate: 28000, enabled: false },
  { id: 'Агааржуулалт',  label: 'Агааржуулалт', Icon: Wind,       rate: 45000, enabled: false },
]

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

const ROOM_HOURS: Record<number, number> = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 }

const STEP_LABELS = ['Үйлчилгээ', 'Цаг', 'Тэмдэглэл', 'Үнэ', 'Баталгаа']

const PROPERTY_TYPES = [
  { type: 'house',     Icon: Home,      label: 'Байшин',    sub: 'Хувийн байшин, гэр' },
  { type: 'apartment', Icon: Building2, label: 'Орон сууц', sub: 'Блок, нийтийн байр' },
  { type: 'office',    Icon: Briefcase, label: 'Оффис',     sub: 'Ажлын байр, студи' },
] as const

export function CreateOrderScreen({ onBack, onOrderCreated }: CreateOrderScreenProps) {
  const [step, setStep] = useState(1)

  // Step 1
  const [service, setService]           = useState('Цэвэрлэгээ')
  const [address, setAddress]           = useState('')
  const [propertyType, setPropertyType] = useState<'house' | 'apartment' | 'office' | null>(null)
  const [rooms, setRooms]               = useState<number | null>(null)
  const [areaSqm, setAreaSqm]           = useState('')

  // Step 2
  const [matchingStrategy, setMatchingStrategy] = useState<MatchingStrategy>('instant')
  const [selectedDate, setSelectedDate]         = useState(0)
  const [selectedTime, setSelectedTime]         = useState<string | null>(null)
  const [urgent, setUrgent]                     = useState(false)

  // Step 3
  const [notes, setNotes] = useState('')

  // Submission
  const [isConfirming,   setIsConfirming]   = useState(false)
  const [confirmError,   setConfirmError]   = useState<string | null>(null)
  const [step1Submitted, setStep1Submitted] = useState(false)
  const [step2Submitted, setStep2Submitted] = useState(false)

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      day:  d.toLocaleDateString('mn-MN', { weekday: 'short' }),
      date: d.getDate(),
      full: d.toISOString().split('T')[0] as string,
    }
  })

  // Pricing
  const baseRate   = SERVICES.find((s) => s.id === service)?.rate ?? 25000
  const hours      = propertyType === 'apartment' && rooms ? (ROOM_HOURS[rooms] ?? 6) : 3
  const basePrice  = baseRate * hours
  const urgentFee  = urgent ? Math.round(basePrice * 0.2) : 0
  const commission = Math.round((basePrice + urgentFee) * 0.15)
  const total      = basePrice + urgentFee + commission

  const isStep1Valid = () =>
    !!address.trim() &&
    !!propertyType &&
    (propertyType !== 'apartment' || (rooms !== null && areaSqm.trim() !== ''))

  const isStep2Valid = () => matchingStrategy === 'instant' || selectedTime !== null

  const handleNext = () => {
    if (step === 1) {
      setStep1Submitted(true)
      if (!isStep1Valid()) return
    }
    if (step === 2) {
      setStep2Submitted(true)
      if (!isStep2Valid()) return
    }
    setStep((s) => s + 1)
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    setConfirmError(null)
    try {
      const scheduledDate = matchingStrategy === 'instant'
        ? new Date().toISOString()
        : `${dates[selectedDate]!.full}T${selectedTime}:00`

      const res = await fetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service,
          address,
          scheduledDate,
          hours,
          totalAmount:      total,
          urgent,
          rooms:            propertyType === 'apartment' ? rooms : undefined,
          areaSqm:          propertyType === 'apartment' && areaSqm ? parseInt(areaSqm) : undefined,
          propertyType:     propertyType ?? undefined,
          notes:            notes || undefined,
          matchingStrategy,
        }),
      })
      const data = (await res.json()) as {
        success: boolean
        data?: { id: string; matchingStrategy: MatchingStrategy }
        error?: string
      }
      if (data.success && data.data) {
        onOrderCreated(data.data.id, data.data.matchingStrategy, total)
      } else {
        setConfirmError(data.error ?? 'Захиалга үүсгэхэд алдаа гарлаа')
      }
    } finally {
      setIsConfirming(false)
    }
  }

  const showAddressError  = step1Submitted && !address.trim()
  const showPropertyError = step1Submitted && !propertyType
  const showRoomsError    = step1Submitted && propertyType === 'apartment' && rooms === null
  const showAreaError     = step1Submitted && propertyType === 'apartment' && !areaSqm.trim()
  const showTimeError     = step2Submitted && matchingStrategy === 'scheduled' && !selectedTime

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={step === 1 ? onBack : () => setStep((s) => s - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Захиалга үүсгэх</h1>
          <p className="text-xs text-muted-foreground">{step}-р алхам: {STEP_LABELS[step - 1]}</p>
        </div>
      </div>

      {/* Step progress */}
      <div className="mt-4 flex items-center gap-1.5 px-6">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i + 1 < step   ? 'bg-primary/40' :
              i + 1 === step ? 'bg-primary'    :
                               'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* ── STEP 1: SERVICE + ADDRESS + PROPERTY ─────────── */}
      {step === 1 && (
        <>
          {/* Service type */}
          <div className="mt-6 px-6">
            <h2 className="font-semibold text-foreground">Үйлчилгээний төрөл</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {SERVICES.map(({ id, label, Icon, enabled }) => (
                <button
                  key={id}
                  onClick={() => enabled && setService(id)}
                  disabled={!enabled}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95 ${
                    service === id && enabled
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : enabled
                      ? 'bg-card text-foreground shadow-sm hover:shadow-md'
                      : 'cursor-not-allowed bg-card opacity-40'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-center text-xs font-medium leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="mt-6 px-6">
            <h2 className="font-semibold text-foreground">Хаяг</h2>
            <div className="relative mt-3">
              <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Дүүрэг, хороо, гудамж, байр..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12 rounded-2xl border-border bg-card pl-12 shadow-sm"
              />
            </div>
            {showAddressError && (
              <p className="mt-2 text-sm text-destructive">Хаягаа оруулна уу</p>
            )}
          </div>

          {/* Property type */}
          <div className="mt-6 px-6">
            <h2 className="font-semibold text-foreground">Үл хөдлөхийн төрөл</h2>
            <div className="mt-3 space-y-3">
              {PROPERTY_TYPES.map(({ type, Icon, label, sub }) => (
                <button
                  key={type}
                  onClick={() => {
                    setPropertyType(type)
                    if (type !== 'apartment') setRooms(null)
                  }}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 transition-all active:scale-95 ${
                    propertyType === type
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-card shadow-sm'
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="text-sm text-muted-foreground">{sub}</p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 transition-colors ${
                      propertyType === type ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  />
                </button>
              ))}
            </div>
            {showPropertyError && (
              <p className="mt-2 text-sm text-destructive">Үл хөдлөхийн төрлийг сонгоно уу</p>
            )}
          </div>

          {/* Apartment sub-fields */}
          {propertyType === 'apartment' && (
            <div className="mt-6 px-6 space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Өрөөний тоо</h2>
                <div className="mt-3 flex gap-3">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRooms(r)}
                      className={`flex-1 rounded-2xl py-3 text-center font-semibold transition-colors active:scale-95 ${
                        rooms === r
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card text-foreground shadow-sm'
                      }`}
                    >
                      {r === 5 ? '5+' : r}
                    </button>
                  ))}
                </div>
                {rooms && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Тооцоолсон хугацаа: {ROOM_HOURS[rooms] ?? 6} цаг
                  </p>
                )}
                {showRoomsError && (
                  <p className="mt-1 text-sm text-destructive">Өрөөний тоог сонгоно уу</p>
                )}
              </div>

              <div>
                <h2 className="font-semibold text-foreground">Талбай (м²)</h2>
                <div className="relative mt-2">
                  <input
                    type="number"
                    min={20}
                    max={500}
                    placeholder="60"
                    value={areaSqm}
                    onChange={(e) => setAreaSqm(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-border bg-card pl-4 pr-12 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    м²
                  </span>
                </div>
                {showAreaError && (
                  <p className="mt-1 text-sm text-destructive">Талбайг оруулна уу</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── STEP 2: MATCHING STRATEGY + DATE & TIME ─────── */}
      {step === 2 && (
        <>
          {/* Strategy selector */}
          <div className="mt-6 px-6">
            <h2 className="font-semibold text-foreground">Захиалгын төрөл</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => setMatchingStrategy('instant')}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95 ${
                  matchingStrategy === 'instant'
                    ? 'bg-accent text-accent-foreground shadow-md'
                    : 'bg-card text-foreground shadow-sm'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  matchingStrategy === 'instant' ? 'bg-white/20' : 'bg-accent/10'
                }`}>
                  <Zap className={`h-5 w-5 ${matchingStrategy === 'instant' ? 'text-white' : 'text-accent'}`} />
                </div>
                <p className="font-semibold text-sm">Яг одоо</p>
                <p className={`text-center text-xs leading-tight ${
                  matchingStrategy === 'instant' ? 'text-accent-foreground/80' : 'text-muted-foreground'
                }`}>
                  Шуурхай дуудлага
                </p>
              </button>

              <button
                onClick={() => setMatchingStrategy('scheduled')}
                className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95 ${
                  matchingStrategy === 'scheduled'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card text-foreground shadow-sm'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  matchingStrategy === 'scheduled' ? 'bg-white/20' : 'bg-primary/10'
                }`}>
                  <CalendarDays className={`h-5 w-5 ${matchingStrategy === 'scheduled' ? 'text-white' : 'text-primary'}`} />
                </div>
                <p className="font-semibold text-sm">Цаг товлох</p>
                <p className={`text-center text-xs leading-tight ${
                  matchingStrategy === 'scheduled' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                }`}>
                  Тусгайлан цаг тохиролцох
                </p>
              </button>
            </div>
          </div>

          {/* Instant: info banner instead of date/time */}
          {matchingStrategy === 'instant' && (
            <div className="mt-6 mx-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Шуурхай хайлт</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Захиалга баталгаажсаны дараа системд хамгийн ойр боломжтой ажилтныг хайж эхэлнэ.
                  Дундаж хүлээлтийн хугацаа: 15–30 минут.
                </p>
              </div>
            </div>
          )}

          {/* Scheduled: date & time pickers */}
          {matchingStrategy === 'scheduled' && (
            <>
              <div className="mt-6">
                <h2 className="px-6 font-semibold text-foreground">Өдөр сонгох</h2>
                <div className="mt-3 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide">
                  {dates.map((d, index) => (
                    <button
                      key={d.full}
                      onClick={() => setSelectedDate(index)}
                      className={`flex min-w-[60px] flex-col items-center rounded-2xl py-3 transition-colors active:scale-95 ${
                        selectedDate === index
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card text-foreground shadow-sm'
                      }`}
                    >
                      <span className="text-xs font-medium opacity-80">{d.day}</span>
                      <span className="mt-1 text-lg font-bold">{d.date}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 px-6">
                <h2 className="font-semibold text-foreground">Цаг сонгох</h2>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-2xl py-3 text-sm font-medium transition-colors active:scale-95 ${
                        selectedTime === time
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card text-foreground shadow-sm'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                {showTimeError && (
                  <p className="mt-2 text-sm text-destructive">Цагаа сонгоно уу</p>
                )}
              </div>
            </>
          )}

          {/* Urgent toggle (both strategies) */}
          <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Яаралтай</p>
                  <p className="text-xs text-muted-foreground">2 цагт ирнэ · +20% нэмэгдэл</p>
                </div>
              </div>
              <button
                onClick={() => setUrgent((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 active:scale-95 ${
                  urgent ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    urgent ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {urgent && (
              <div className="mt-3 rounded-xl bg-accent/10 px-3 py-2">
                <p className="text-xs font-medium text-accent">
                  +₮{urgentFee.toLocaleString()} яаралтай нэмэгдэл нэмэгдэнэ
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── STEP 3: NOTES & PHOTOS ─────────────────────── */}
      {step === 3 && (
        <>
          <div className="mt-6 px-6">
            <h2 className="font-semibold text-foreground">Тусгай заавар</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ажилтанд мэдэгдэх зүйл байвал бичнэ үү</p>
            <textarea
              placeholder="Жишээ: Нохой байна, 2-р давхарт..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mt-6 px-6">
            <h2 className="font-semibold text-foreground">Орчны зураг</h2>
            <p className="mt-1 text-sm text-muted-foreground">Цэвэрлэх орчноо харуулах зураг нэмнэ үү (заавал биш)</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card transition-all active:scale-95 hover:border-primary/50"
                >
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <span className="mt-1 text-xs text-muted-foreground">Зураг нэмэх</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">
              Зураг нэмсэнээр ажилтан орчинг урьдчилан мэдэж, илүү сайн бэлдэж ирнэ.
              Зураг нэмэхгүй ч захиалга хийж болно.
            </p>
          </div>
        </>
      )}

      {/* ── STEP 4: PRICE SUMMARY ───────────────────────── */}
      {step === 4 && (
        <>
          <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="font-semibold text-foreground">Захиалгын хураангуй</h2>
            <div className="mt-3 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Үйлчилгээ</span>
                <span className="font-medium text-foreground">{service}</span>
              </div>
              <div className="flex items-start justify-between gap-4 text-sm">
                <span className="shrink-0 text-muted-foreground">Хаяг</span>
                <span className="text-right text-xs font-medium leading-snug text-foreground">{address}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Захиалгын төрөл</span>
                <span className="font-medium text-foreground">
                  {matchingStrategy === 'instant' ? 'Яг одоо (Шуурхай)' : `Цаг товлох · ${dates[selectedDate]?.full ?? '—'} ${selectedTime ?? ''}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Хугацаа</span>
                <span className="font-medium text-foreground">{hours} цаг</span>
              </div>
              {urgent && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Яаралтай</span>
                  <span className="font-medium text-accent">Тийм (+20%)</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="font-semibold text-foreground">Үнийн тооцоо</h2>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Үйлчилгээний үнэ ({hours} цаг)</span>
                <span className="text-foreground">₮{basePrice.toLocaleString()}</span>
              </div>
              {urgentFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Яаралтай нэмэгдэл (+20%)</span>
                  <span className="font-medium text-accent">+₮{urgentFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Платформын шимтгэл (15%)</span>
                <span className="text-foreground">₮{commission.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <span className="font-semibold text-foreground">Нийт</span>
              <span className="text-lg font-bold text-primary">₮{total.toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-4 mx-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-success/10">
              <Lock className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-success">Escrow-оор хамгаалагдсан</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ажил дуусаагүй бол мөнгө суллагдахгүй
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 5: CONFIRM ORDER ───────────────────────── */}
      {step === 5 && (
        <>
          {/* Summary hero */}
          <div className="mt-6 mx-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg">
            <p className="text-sm font-medium text-primary-foreground/80">Нийт төлбөр</p>
            <p className="mt-1 text-3xl font-bold text-primary-foreground">₮{total.toLocaleString()}</p>
            <p className="mt-2 text-xs text-primary-foreground/70">
              {matchingStrategy === 'instant'
                ? 'Захиалга баталгаажсаны дараа ажилтан хайж эхэлнэ. Ажилтан олдсоны дараа л төлбөр авна.'
                : 'Захиалга нийтлэгдсэний дараа ажилтнуудаас саналыг хүлээж авч, та тохиромжтой хүнийг сонгоод төлнө.'}
            </p>
          </div>

          {/* What happens next */}
          <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="font-semibold text-foreground">Цаашид юу болох вэ?</h2>
            <div className="mt-3 space-y-3">
              {matchingStrategy === 'instant' ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <span className="text-xs font-bold">1</span>
                    </div>
                    <p className="text-sm text-foreground">Систем боломжтой ажилтныг хайна</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <p className="text-sm text-foreground">Та ажилтны профайлыг харж баталгаажуулна</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <span className="text-xs font-bold">3</span>
                    </div>
                    <p className="text-sm text-foreground">Escrow-ээр төлбөр хийснээр ажил эхэлнэ</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <span className="text-xs font-bold">1</span>
                    </div>
                    <p className="text-sm text-foreground">Захиалга ажилтнуудад нийтлэгдэнэ</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <span className="text-xs font-bold">2</span>
                    </div>
                    <p className="text-sm text-foreground">Сонирхсон ажилтнуудаас саналыг хүлээнэ</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <span className="text-xs font-bold">3</span>
                    </div>
                    <p className="text-sm text-foreground">Тохиромжтой хүнийг сонгоод төлбөр хийнэ</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {confirmError && (
            <div className="mt-4 mx-6 rounded-2xl bg-destructive/10 px-4 py-3">
              <p className="text-center text-sm text-destructive">{confirmError}</p>
            </div>
          )}

          <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-center text-xs text-muted-foreground">
              Захиалга илгээснээр та манай үйлчилгээний нөхцлийг зөвшөөрсөнд тооцно.
            </p>
          </div>
        </>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        {step < 5 ? (
          <Button
            onClick={handleNext}
            className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          >
            Үргэлжлэх
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={() => { void handleConfirm() }}
            disabled={isConfirming}
            className="h-14 w-full rounded-2xl bg-accent text-base font-semibold text-accent-foreground shadow-md hover:bg-accent/90 disabled:opacity-50 active:scale-95 transition-all"
          >
            {isConfirming ? 'Илгээж байна...' : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                {matchingStrategy === 'instant' ? 'Ажилтан хайх' : 'Захиалга нийтлэх'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
