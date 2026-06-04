'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, MapPin, Lock, Sparkles, Droplets,
  Zap, Wrench, Paintbrush, Wind, Camera, Hammer, Truck, WashingMachine,
  Clock, CalendarDays, CheckCircle, LocateFixed,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LocationPicker } from '@/components/location-picker'
import { BookingFields, type BookingFieldsValue } from '@/components/booking-fields'
import { calculatePrice, DEFAULT_PLATFORM_SETTINGS } from '@/lib/pricing'
import type { MatchingStrategy, PricingModel } from '@/lib/types'
import { apiFetch } from '@/lib/api-fetch'

interface CreateOrderScreenProps {
  preSelectedServiceId?: number | null
}

// Matches GET /api/service-types response shape
interface ServiceType {
  id:                     number
  name_mn:                string
  icon:                   string
  sort_order:             number
  pricing_model:          PricingModel
  base_rate:              number
  min_charge:             number
  unit_label:             string
  requires_property_type: boolean
}

const ICON_MAP = {
  sparkles: Sparkles, droplets: Droplets, zap: Zap,
  wrench: Wrench, paintbrush: Paintbrush, wind: Wind,
  hammer: Hammer, truck: Truck, 'washing-machine': WashingMachine,
} as const

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

const STEP_LABELS = ['Үйлчилгээ', 'Цаг', 'Тэмдэглэл', 'Үнэ', 'Баталгаа']

export function CreateOrderScreen({ preSelectedServiceId }: CreateOrderScreenProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const [serviceTypes,    setServiceTypes]    = useState<ServiceType[]>([])
  const [serviceTypeId,   setServiceTypeId]   = useState<number | null>(null)
  const [address,         setAddress]         = useState('')
  const [bookingData,     setBookingData]     = useState<BookingFieldsValue>({
    quantity: 0, estimatedHours: 1, isValid: false,
  })

  const [matchingStrategy, setMatchingStrategy] = useState<MatchingStrategy>('instant')
  const [selectedDate,     setSelectedDate]     = useState(0)
  const [selectedTime,     setSelectedTime]     = useState<string | null>(null)
  const [urgent,           setUrgent]           = useState(false)

  const [notes, setNotes] = useState('')

  const isDevPanel = process.env.NEXT_PUBLIC_DEV_PANEL === 'true'

  const [isConfirming,       setIsConfirming]       = useState(false)
  const [paymentPending,     setPaymentPending]     = useState(false)
  const [confirmError,       setConfirmError]       = useState<string | null>(null)
  const [step1Submitted,     setStep1Submitted]     = useState(false)
  const [step2Submitted,     setStep2Submitted]     = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const [serviceLoadError, setServiceLoadError] = useState(false)

  useEffect(() => {
    apiFetch('/api/service-types')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((j: { success: boolean; data?: ServiceType[] }) => {
        if (j.success && j.data?.length) {
          setServiceTypes(j.data)
          const validId = preSelectedServiceId != null && j.data.some((s) => s.id === preSelectedServiceId)
            ? preSelectedServiceId
            : j.data[0]!.id
          setServiceTypeId(validId)
        } else {
          setServiceLoadError(true)
        }
      })
      .catch(() => setServiceLoadError(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const selectedService = serviceTypes.find((s) => s.id === serviceTypeId)
  const isInspection    = selectedService?.pricing_model === 'inspection'
  const isSurvey        = selectedService?.pricing_model === 'survey'

  // Live price breakdown — pure calculation, no async
  const breakdown = selectedService
    ? calculatePrice({
        service:  selectedService,
        settings: DEFAULT_PLATFORM_SETTINGS,
        quantity: bookingData.quantity,
        isUrgent: urgent,
      })
    : null

  const isStep1Valid = () => isSurvey ? bookingData.isValid : (!!address.trim() && bookingData.isValid)
  const isStep2Valid = () => matchingStrategy === 'instant' || selectedTime !== null

  const handleNext = () => {
    if (step === 1) {
      setStep1Submitted(true)
      if (!isStep1Valid()) return
      if (isInspection) {
        setMatchingStrategy('scheduled')
        setStep(3)  // skip date/time step — InspectionForm already collects it
        return
      }
      if (isSurvey) {
        setMatchingStrategy('scheduled')
        setStep(4)  // skip date/time and notes steps — SurveyForm collects both
        return
      }
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
      const scheduledDate = (isInspection || isSurvey)
        ? (bookingData.scheduledDate ?? new Date().toISOString())
        : matchingStrategy === 'instant'
          ? new Date().toISOString()
          : `${dates[selectedDate]!.full}T${selectedTime}:00`

      // Inspection: prepend problem description to any additional notes from step 3
      const combinedNotes = isInspection
        ? [bookingData.problemDescription, notes].filter(Boolean).join('\n\n') || undefined
        : notes || undefined

      // Survey: fromAddress from SurveyForm is the order address
      const orderAddress = isSurvey ? (bookingData.fromAddress ?? address) : address

      const surveyPayload = isSurvey && bookingData.surveyDetails
        ? {
            fromAddress: bookingData.fromAddress ?? '',
            ...bookingData.surveyDetails,
          }
        : undefined

      // Step 1: create payment intent and get invoice_id
      const invoiceRes = await apiFetch('/api/payments/create-invoice', { method: 'POST' })
      if (!invoiceRes.ok) {
        setConfirmError(`[1] HTTP ${invoiceRes.status} — Нэхэмжлэл үүсгэхэд алдаа`)
        return
      }
      const invoiceData = (await invoiceRes.json()) as {
        success: boolean
        data?: { invoice_id: string }
        error?: string
      }
      console.log('[order] step1 create-invoice', invoiceRes.status, invoiceData)
      if (!invoiceData.success || !invoiceData.data) {
        setConfirmError(`[1] ${invoiceData.error ?? 'Нэхэмжлэл үүсгэхэд алдаа'}`)
        return
      }
      const { invoice_id } = invoiceData.data

      if (!isDevPanel) {
        // real payment confirmation arrives via QPay webhook (Phase 2, parked) — dev-sim-pay is dev-only
        setPaymentPending(true)
        return
      }

      // Step 2: confirm payment (dev environment only)
      const simPayRes = await apiFetch('/api/payments/dev-sim-pay', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ invoiceId: invoice_id }),
      })
      if (!simPayRes.ok) {
        setConfirmError(`[2] HTTP ${simPayRes.status} — Төлбөр баталгаажуулахад алдаа`)
        return
      }
      const simPayData = (await simPayRes.json()) as { success: boolean; error?: string }
      console.log('[order] step2 dev-sim-pay', simPayRes.status, simPayData)
      if (!simPayData.success) {
        setConfirmError(`[2] ${simPayData.error ?? 'Төлбөр баталгаажуулахад алдаа'}`)
        return
      }

      // Step 3: create order with confirmed invoice_id
      const orderBody = {
        serviceTypeId,
        address:       orderAddress,
        scheduledDate,
        hours:         bookingData.estimatedHours,
        totalAmount:   breakdown?.total ?? 0,
        urgent,
        areaSqm:       bookingData.quantity > 0 ? bookingData.quantity : undefined,
        propertyType:  bookingData.propertyType,
        notes:         combinedNotes,
        matchingStrategy,
        surveyDetails: surveyPayload,
        invoiceId:     invoice_id,
      }
      console.log('[order] step3 POST /api/orders body', orderBody)
      const res = await apiFetch('/api/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(orderBody),
      })
      if (!res.ok) {
        setConfirmError(`[3] HTTP ${res.status} — Захиалга үүсгэхэд алдаа гарлаа`)
        return
      }
      const data = (await res.json()) as {
        success: boolean
        data?: { id: string; matchingStrategy: MatchingStrategy; totalAmount: number }
        error?: string
      }
      if (data.success && data.data) {
        const { id, matchingStrategy: ms } = data.data
        if (ms === 'scheduled') {
          router.push(`/orders/${id}/board`)
        } else {
          router.push(`/orders/${id}/searching`)
        }
      } else {
        setConfirmError(data.error ?? 'Захиалга үүсгэхэд алдаа гарлаа')
      }
    } catch {
      setConfirmError('Сүлжээний алдаа. Дахин оролдоно уу')
    } finally {
      setIsConfirming(false)
    }
  }

  const showAddressError = step1Submitted && !address.trim()
  const showTimeError    = step2Submitted && matchingStrategy === 'scheduled' && !selectedTime

  return (
    <div className="flex min-h-screen flex-col bg-background pb-48">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={
            step === 1 ? () => router.back() :
            (step === 3 && isInspection) ? () => setStep(1) :
            (step === 4 && isSurvey) ? () => setStep(1) :
            () => setStep((s) => s - 1)
          }
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

      {/* ── STEP 1: SERVICE + ADDRESS + BOOKING FIELDS ─── */}
      {step === 1 && (
        <>
          {/* Service type */}
          <div className="mt-6 px-6">
            <h2 className="font-semibold text-foreground">Үйлчилгээний төрөл</h2>
            {serviceLoadError && (
              <p className="mt-2 text-sm text-destructive">Үйлчилгээний мэдээлэл ачаалахад алдаа гарлаа. Дахин оролдоно уу.</p>
            )}
            {preSelectedServiceId != null ? (
              /* Pre-selected from home screen — read-only chip */
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 shadow-sm">
                {selectedService && (() => {
                  const Icon = ICON_MAP[selectedService.icon as keyof typeof ICON_MAP] ?? Sparkles
                  return (
                    <>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-semibold text-primary">{selectedService.name_mn}</span>
                    </>
                  )
                })()}
              </div>
            ) : (
              /* Full picker grid */
              <div className="mt-3 grid grid-cols-3 gap-3">
                {serviceTypes.map((s) => {
                  const Icon = ICON_MAP[s.icon as keyof typeof ICON_MAP] ?? Sparkles
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setServiceTypeId(s.id)
                        setBookingData({ quantity: 0, estimatedHours: 1, isValid: false })
                        setStep1Submitted(false)
                      }}
                      className={`flex flex-col items-center gap-2 rounded-2xl p-4 transition-all active:scale-95 ${
                        serviceTypeId === s.id
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-card text-foreground shadow-sm hover:shadow-md'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-center text-xs font-medium leading-tight">{s.name_mn}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Address — hidden for survey; SurveyForm collects fromAddress + toAddress */}
          {!isSurvey && (
            <div className="mt-6 px-6">
              <h2 className="font-semibold text-foreground">Хаяг</h2>
              <button
                onClick={() => setShowLocationPicker(true)}
                className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary active:scale-95 transition-all"
              >
                <LocateFixed className="h-4 w-4 shrink-0" />
                {address ? 'Байршил өөрчлөх' : 'Газрын зурагт байршил сонгох'}
              </button>
              {address && (
                <div className="mt-2 flex items-start gap-2 rounded-2xl bg-card px-4 py-3 shadow-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm text-foreground">{address}</p>
                </div>
              )}
              <div className="relative mt-2">
                <Input
                  placeholder="Эсвэл хаяг гараар оруулах..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-12 rounded-2xl border-border bg-card pl-4 shadow-sm"
                />
              </div>
              {showAddressError && (
                <p className="mt-2 text-sm text-destructive">Хаягаа оруулна уу</p>
              )}
            </div>
          )}

          {/* Booking fields — routed by pricing_model */}
          {selectedService && (
            <BookingFields
              key={serviceTypeId ?? 0}
              service={selectedService}
              onChange={setBookingData}
              submitted={step1Submitted}
            />
          )}
        </>
      )}

      {/* ── STEP 2: MATCHING STRATEGY + DATE & TIME ─────── */}
      {step === 2 && (
        <>
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

          {/* Urgent toggle */}
          <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Яаралтай</p>
                  <p className="text-xs text-muted-foreground">2 цагт ирнэ</p>
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
            {urgent && breakdown && breakdown.urgentSurcharge > 0 && (
              <div className="mt-3 rounded-xl bg-accent/10 px-3 py-2">
                <p className="text-xs font-medium text-accent">
                  +₮{breakdown.urgentSurcharge.toLocaleString()} яаралтай нэмэгдэл нэмэгдэнэ
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
          {isSurvey ? (
            /* Survey: no price shown — mover quotes after visiting */
            <>
              <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
                <h2 className="font-semibold text-foreground">Захиалгын хураангуй</h2>
                <div className="mt-3 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Үйлчилгээ</span>
                    <span className="font-medium text-foreground">{selectedService?.name_mn ?? '—'}</span>
                  </div>
                  {bookingData.fromAddress && (
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="shrink-0 text-muted-foreground">Эхлэх</span>
                      <span className="text-right text-xs font-medium leading-snug text-foreground">{bookingData.fromAddress}</span>
                    </div>
                  )}
                  {bookingData.surveyDetails?.toAddress && (
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="shrink-0 text-muted-foreground">Хүрэх</span>
                      <span className="text-right text-xs font-medium leading-snug text-foreground">{bookingData.surveyDetails.toAddress}</span>
                    </div>
                  )}
                  {bookingData.scheduledDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Цаг</span>
                      <span className="font-medium text-foreground">
                        {bookingData.scheduledDate.slice(0, 10)} {bookingData.scheduledDate.slice(11, 16)}
                      </span>
                    </div>
                  )}
                  {bookingData.surveyDetails?.volumeNote && (
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="shrink-0 text-muted-foreground">Ачаа</span>
                      <span className="text-right text-xs font-medium leading-snug text-foreground">{bookingData.surveyDetails.volumeNote}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 mx-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
                <p className="text-sm font-semibold text-primary">Ачаагаа үзээд тээвэрлэгч үнэ гаргана.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Урьдчилгаа төлбөр байхгүй — тээвэрлэгч ирж ачааг үзсэний дараа үнэ санал болгоно.
                  Та зөвшөөрсний дараа эхэлнэ.
                </p>
              </div>
            </>
          ) : breakdown && (
            /* Standard: show price breakdown */
            <>
              <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
                <h2 className="font-semibold text-foreground">Захиалгын хураангуй</h2>
                <div className="mt-3 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Үйлчилгээ</span>
                    <span className="font-medium text-foreground">
                      {selectedService?.name_mn ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="shrink-0 text-muted-foreground">Хаяг</span>
                    <span className="text-right text-xs font-medium leading-snug text-foreground">{address}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Захиалгын төрөл</span>
                    <span className="font-medium text-foreground">
                      {matchingStrategy === 'instant'
                        ? 'Яг одоо (Шуурхай)'
                        : isInspection && bookingData.scheduledDate
                          ? `Цаг товлох · ${bookingData.scheduledDate.slice(0, 10)} ${bookingData.scheduledDate.slice(11, 16)}`
                          : `Цаг товлох · ${dates[selectedDate]?.full ?? '—'} ${selectedTime ?? ''}`}
                    </span>
                  </div>
                  {bookingData.quantity > 0 && selectedService && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Хэмжээ</span>
                      <span className="font-medium text-foreground">
                        {bookingData.quantity} {selectedService.unit_label}
                      </span>
                    </div>
                  )}
                  {urgent && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Яаралтай</span>
                      <span className="font-medium text-accent">Тийм</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
                <h2 className="font-semibold text-foreground">Үнийн тооцоо</h2>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Үйлчилгээний үнэ
                      {bookingData.quantity > 0 && selectedService
                        ? ` (${bookingData.quantity} ${selectedService.unit_label})`
                        : ''}
                    </span>
                    <span className="text-foreground">₮{breakdown.subtotal.toLocaleString()}</span>
                  </div>
                  {breakdown.urgentSurcharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Яаралтай нэмэгдэл</span>
                      <span className="font-medium text-accent">+₮{breakdown.urgentSurcharge.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex justify-between border-t border-border pt-3">
                  <span className="font-semibold text-foreground">Нийт</span>
                  <span className="text-lg font-bold text-primary">₮{breakdown.total.toLocaleString()}</span>
                </div>
              </div>

              {isInspection && (
                <div className="mt-4 mx-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-sm font-semibold text-primary">
                    Дуудлагын хураамж: ₮{breakdown.subtotal.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ажилтан үзээд засварын үнийг гаргана. Та зөвшөөрсний дараа ажил эхэлнэ.
                  </p>
                </div>
              )}

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
        </>
      )}

      {/* ── STEP 5: CONFIRM ORDER ───────────────────────── */}
      {step === 5 && (
        <>
          <div className="mt-6 mx-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 shadow-lg">
            {isSurvey ? (
              <>
                <p className="text-sm font-medium text-primary-foreground/80">Нүүлгэлтийн захиалга</p>
                <p className="mt-1 text-2xl font-bold text-primary-foreground">Үнэ тодорхойгүй</p>
                <p className="mt-2 text-xs text-primary-foreground/70">
                  Тээвэрлэгч ачааг үзсэний дараа үнэ санал болгоно. Та зөвшөөрсний дараа нүүлгэлт эхэлнэ.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-primary-foreground/80">Нийт төлбөр</p>
                <p className="mt-1 text-3xl font-bold text-primary-foreground">₮{breakdown?.total.toLocaleString() ?? '0'}</p>
                <p className="mt-2 text-xs text-primary-foreground/70">
                  {isInspection
                    ? 'Ажилтан ирж асуудлыг үзэж, засварын үнийн санал гаргана. Та зөвшөөрсний дараа ажил эхэлнэ.'
                    : matchingStrategy === 'instant'
                      ? 'Захиалга баталгаажсаны дараа ажилтан хайж эхэлнэ. Ажилтан олдсоны дараа л төлбөр авна.'
                      : 'Захиалга нийтлэгдсэний дараа ажилтнуудаас саналыг хүлээж авч, та тохиромжтой хүнийг сонгоод төлнө.'}
                </p>
              </>
            )}
          </div>

          <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <h2 className="font-semibold text-foreground">Цаашид юу болох вэ?</h2>
            <div className="mt-3 space-y-3">
              {isSurvey ? (
                <>
                  {[
                    'Тээвэрлэгч таны ачааг үзэхээр ирнэ',
                    'Ачаан дээр үндэслэн үнийн санал гаргана',
                    'Та зөвшөөрсний дараа нүүлгэлт эхэлнэ',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <span className="text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-foreground">{text}</p>
                    </div>
                  ))}
                </>
              ) : isInspection ? (
                <>
                  {[
                    'Ажилтан таны дуудлагыг хүлээн авна',
                    'Ажилтан очиж асуудлыг үзнэ',
                    'Засварын үнийн санал гаргах бөгөөд та зөвшөөрсний дараа ажил эхэлнэ',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <span className="text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-foreground">{text}</p>
                    </div>
                  ))}
                </>
              ) : matchingStrategy === 'instant' ? (
                <>
                  {[
                    'Систем боломжтой ажилтныг хайна',
                    'Та ажилтны профайлыг харж баталгаажуулна',
                    'Escrow-ээр төлбөр хийснээр ажил эхэлнэ',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                        <span className="text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-foreground">{text}</p>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    'Захиалга ажилтнуудад нийтлэгдэнэ',
                    'Сонирхсон ажилтнуудаас саналыг хүлээнэ',
                    'Тохиромжтой хүнийг сонгоод төлбөр хийнэ',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <span className="text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-sm text-foreground">{text}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {confirmError && (
            <div className="mt-4 mx-6 rounded-2xl bg-destructive/10 px-4 py-3">
              <p className="text-center text-sm text-destructive">{confirmError}</p>
            </div>
          )}

          {paymentPending && (
            <div className="mt-4 mx-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4">
              <p className="text-sm font-semibold text-primary">Нэхэмжлэл үүсгэгдлээ</p>
              <p className="mt-1 text-xs text-muted-foreground">
                QPay төлбөр баталгаажсаны дараа захиалга үүснэ.
              </p>
            </div>
          )}

          <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-center text-xs text-muted-foreground">
              Захиалга илгээснээр та манай үйлчилгээний нөхцлийг зөвшөөрсөнд тооцно.
            </p>
          </div>
        </>
      )}

      {/* Location picker overlay */}
      {showLocationPicker && (
        <LocationPicker
          onSelect={(addr) => { setAddress(addr); setShowLocationPicker(false) }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* Fixed bottom CTA — sits above AppBottomNav (~88px) */}
      <div className="fixed bottom-20 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-2 pt-4">
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
            disabled={isConfirming || paymentPending || (!isSurvey && !breakdown)}
            className="h-14 w-full rounded-2xl bg-accent text-base font-semibold text-accent-foreground shadow-md hover:bg-accent/90 disabled:opacity-50 active:scale-95 transition-all"
          >
            {isConfirming ? 'Илгээж байна...' : paymentPending ? 'Төлбөр хүлээгдэж байна' : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                {isSurvey
                  ? 'Нүүлгэлт захиалах'
                  : isInspection
                    ? 'Дуудлага илгээх'
                    : matchingStrategy === 'instant'
                      ? 'Ажилтан хайх'
                      : 'Захиалга нийтлэх'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
