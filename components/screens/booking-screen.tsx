'use client'

import { useState } from 'react'
import { ArrowLeft, MapPin, Lock, Star, Home, Building2, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface BookingScreenProps {
  workerId: string
  onBack: () => void
  onConfirm: (booking: BookingDetails) => void
}

interface BookingDetails {
  workerId: string
  date: string
  time: string
  duration: number
  address: string
  notes: string
  paymentMethod: 'qpay' | 'socialpay'
}

const unavailableTimes = new Set(['10:00', '14:00'])

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

const durations = [
  { label: '2 цаг', value: 2 },
  { label: '3 цаг', value: 3 },
  { label: '4 цаг', value: 4 },
  { label: 'Тусгай', value: 0 },
]

const workerInfo = {
  id: '1',
  name: 'Батболд Д.',
  rating: 4.9,
  reviews: 124,
  pricePerHour: 25000,
  specialty: 'Цэвэрлэгээ',
  image: '',
}

export function BookingScreen({ workerId, onBack, onConfirm }: BookingScreenProps) {
  const [selectedDate, setSelectedDate] = useState<number>(0)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(2)
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [propertyType, setPropertyType] = useState<'house' | 'apartment' | 'office' | null>(null)
  const [rooms, setRooms] = useState<string | null>(null)
  const [area, setArea] = useState('')
  const [floor, setFloor] = useState('')
  const [hasElevator, setHasElevator] = useState(false)

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return {
      day: date.toLocaleDateString('mn-MN', { weekday: 'short' }),
      date: date.getDate(),
      full: date.toISOString().split('T')[0],
    }
  })

  const hours = selectedDuration > 0 ? selectedDuration : 2
  const basePrice = workerInfo.pricePerHour * hours

  // Room multiplier (apartment only)
  const roomsNum = rooms === '5+' ? 5 : rooms ? parseInt(rooms) : 1
  const roomMultiplierMap: Record<number, number> = { 1: 1.0, 2: 1.3, 3: 1.6, 4: 1.9, 5: 2.2 }
  const roomsFee =
    propertyType === 'apartment' && roomsNum > 1
      ? Math.round(basePrice * ((roomMultiplierMap[Math.min(roomsNum, 5)] ?? 2.2) - 1))
      : 0

  // Area fee (apartment, >80m²: +10% per 20m² over 80)
  const areaNum = parseInt(area) || 0
  const areaSteps = Math.max(0, Math.floor((areaNum - 80) / 20))
  const areaFee =
    propertyType === 'apartment' && areaSteps > 0
      ? Math.round(basePrice * areaSteps * 0.1)
      : 0

  // Stairs fee (apartment, no elevator, floor ≥ 3)
  const floorNum = parseInt(floor) || 0
  const stairsFee =
    propertyType === 'apartment' && !hasElevator && floorNum >= 3 ? 5000 : 0

  // Office flat multiplier (+40%)
  const officeFee = propertyType === 'office' ? Math.round(basePrice * 0.4) : 0

  const adjustedBase = basePrice + officeFee + roomsFee + areaFee + stairsFee
  const commission = Math.round(adjustedBase * 0.15)
  const total = adjustedBase + commission

  const canConfirm =
    propertyType !== null &&
    selectedTime !== null &&
    address.trim() !== '' &&
    (propertyType !== 'apartment' || (rooms !== null && area.trim() !== ''))
  const showAddressError = submitted && !address.trim()
  const showPropertyError = submitted && !propertyType
  const showRoomsError = submitted && propertyType === 'apartment' && !rooms
  const showAreaError = submitted && propertyType === 'apartment' && !area.trim()

  const handleConfirm = () => {
    setSubmitted(true)
    if (!canConfirm) return
    onConfirm({
      workerId,
      date: dates[selectedDate].full,
      time: selectedTime!,
      duration: selectedDuration,
      address,
      notes,
      paymentMethod: 'qpay',
    })
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
        <h1 className="text-xl font-bold text-foreground">Захиалга</h1>
      </div>

      {/* Worker Summary */}
      <div className="mt-6 mx-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={workerInfo.image} />
          <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
            {workerInfo.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{workerInfo.name}</p>
            <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
              ДАН
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="text-sm font-medium text-foreground">{workerInfo.rating}</span>
            <span className="text-xs text-muted-foreground">({workerInfo.reviews})</span>
          </div>
          <p className="text-sm font-semibold text-primary">₮{workerInfo.pricePerHour.toLocaleString()}/цаг</p>
        </div>
        <button
          onClick={onBack}
          className="shrink-0 text-sm font-medium text-primary active:scale-95 transition-all"
        >
          Өөрчлөх
        </button>
      </div>

      {/* Date Picker */}
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

      {/* Time Picker */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Цаг сонгох</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {timeSlots.map((time) => {
            const unavailable = unavailableTimes.has(time)
            return (
              <button
                key={time}
                onClick={() => !unavailable && setSelectedTime(time)}
                className={`rounded-2xl py-3 text-sm font-medium transition-colors active:scale-95 ${
                  unavailable
                    ? 'cursor-not-allowed opacity-40 line-through bg-card text-foreground shadow-sm'
                    : selectedTime === time
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card text-foreground shadow-sm'
                }`}
              >
                {time}
              </button>
            )
          })}
        </div>
      </div>

      {/* Duration Chips */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Хугацаа</h2>
        <div className="mt-3 flex gap-3">
          {durations.map((d) => (
            <button
              key={d.label}
              onClick={() => setSelectedDuration(d.value)}
              className={`min-w-[60px] rounded-2xl px-4 py-3 text-sm font-medium transition-colors active:scale-95 ${
                selectedDuration === d.value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-foreground shadow-sm'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Address Input */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Хаяг</h2>
        <div className="relative mt-3">
          <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Хаяг оруулах..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-12 rounded-2xl border-border bg-card pl-12 shadow-sm"
          />
        </div>
        {showAddressError && (
          <p className="mt-2 text-sm text-destructive">Хаягаа оруулна уу</p>
        )}
        <textarea
          placeholder="Нэмэлт тайлбар (заавал биш)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Property Type */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Үл хөдлөх хөрөнгийн төрөл</h2>
        <div className="mt-3 space-y-3">
          {(
            [
              { type: 'house', Icon: Home, label: 'Байшин', sub: 'Хувийн байшин, гэр' },
              { type: 'apartment', Icon: Building2, label: 'Орон сууц', sub: 'Блок, нийтийн байр' },
              { type: 'office', Icon: Briefcase, label: 'Оффис', sub: 'Ажлын байр, студи' },
            ] as const
          ).map(({ type, Icon, label, sub }) => (
            <button
              key={type}
              onClick={() => setPropertyType(type)}
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
          <p className="mt-2 text-sm text-destructive">Үл хөдлөх хөрөнгийн төрлийг сонгоно уу</p>
        )}
      </div>

      {/* Apartment Sub-fields */}
      {propertyType === 'apartment' && (
        <div className="mt-6 px-6 space-y-4">
          {/* Rooms */}
          <div>
            <h2 className="font-semibold text-foreground">Өрөөний тоо</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
              {['1', '2', '3', '4', '5+'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRooms(r)}
                  className={`min-w-[52px] rounded-2xl py-3 text-center font-semibold transition-colors active:scale-95 ${
                    rooms === r
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card text-foreground shadow-sm'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {showRoomsError && (
              <p className="mt-1 text-sm text-destructive">Өрөөний тоог сонгоно уу</p>
            )}
          </div>

          {/* Area */}
          <div>
            <h2 className="font-semibold text-foreground">Талбай (м²)</h2>
            <div className="relative mt-2">
              <input
                type="number"
                min={20}
                max={500}
                placeholder="60"
                value={area}
                onChange={(e) => setArea(e.target.value)}
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

          {/* Floor */}
          <div>
            <h2 className="font-semibold text-foreground">Давхар</h2>
            <input
              type="number"
              min={1}
              max={50}
              placeholder="3"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Elevator toggle */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-foreground">Лифт байна</span>
            <button
              onClick={() => setHasElevator((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 active:scale-95 ${
                hasElevator ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  hasElevator ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Үйлчилгээний үнэ ({hours} цаг)</span>
          <span className="text-foreground">₮{basePrice.toLocaleString()}</span>
        </div>
        {roomsFee > 0 && (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Өрөөний тоо нэмэгдэл</span>
            <span className="font-medium text-accent">+₮{roomsFee.toLocaleString()}</span>
          </div>
        )}
        {areaFee > 0 && (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Талбайн нэмэгдэл</span>
            <span className="font-medium text-accent">+₮{areaFee.toLocaleString()}</span>
          </div>
        )}
        {stairsFee > 0 && (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Давхарын нэмэгдэл</span>
            <span className="font-medium text-accent">+₮{stairsFee.toLocaleString()}</span>
          </div>
        )}
        {officeFee > 0 && (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Оффисын нэмэгдэл</span>
            <span className="font-medium text-accent">+₮{officeFee.toLocaleString()}</span>
          </div>
        )}
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Платформын шимтгэл (15%)</span>
          <span className="text-foreground">₮{commission.toLocaleString()}</span>
        </div>
        <div className="mt-3 border-t border-border pt-3 flex justify-between">
          <span className="font-semibold text-foreground">Нийт</span>
          <span className="font-bold text-primary text-lg">₮{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Escrow Badge */}
      <div className="mt-6 mx-6 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/5 p-3">
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

      {/* Payment Buttons */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Төлбөрийн хэрэгсэл</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Button
            onClick={() => alert('QPay coming soon')}
            className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          >
            QPay
          </Button>
          <Button
            variant="outline"
            onClick={() => alert('SocialPay coming soon')}
            className="h-14 w-full rounded-2xl border-border bg-card text-base font-semibold shadow-sm hover:bg-card/80 active:scale-95 transition-all"
          >
            SocialPay
          </Button>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md disabled:opacity-50 active:scale-95 transition-all"
        >
          Захиалах
        </Button>
      </div>
    </div>
  )
}
