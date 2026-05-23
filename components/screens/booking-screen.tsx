'use client'

import { useState } from 'react'
import { ArrowLeft, MapPin, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
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
  address: string
  paymentMethod: 'qpay' | 'socialpay'
}

const timeSlots = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
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
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'qpay' | 'socialpay' | null>(null)

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return {
      day: date.toLocaleDateString('mn-MN', { weekday: 'short' }),
      date: date.getDate(),
      full: date.toISOString().split('T')[0],
    }
  })

  const subtotal = workerInfo.pricePerHour * 2 // Assuming 2 hours
  const platformFee = Math.round(subtotal * 0.1)
  const total = subtotal + platformFee

  const canConfirm = selectedTime && address && paymentMethod

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm({
      workerId,
      date: dates[selectedDate].full,
      time: selectedTime,
      address,
      paymentMethod,
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Захиалга</h1>
      </div>

      {/* Worker Summary */}
      <div className="mt-6 mx-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Avatar className="h-14 w-14">
          <AvatarImage src={workerInfo.image} />
          <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
            {workerInfo.name[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{workerInfo.name}</p>
          <p className="text-sm text-muted-foreground">{workerInfo.specialty}</p>
          <p className="text-sm font-semibold text-primary">₮{workerInfo.pricePerHour.toLocaleString()}/цаг</p>
        </div>
      </div>

      {/* Date Picker */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Өдөр сонгох</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dates.map((d, index) => (
            <button
              key={d.full}
              onClick={() => setSelectedDate(index)}
              className={`flex min-w-[60px] flex-col items-center rounded-2xl p-3 transition-colors ${
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
        <div className="mt-3 grid grid-cols-5 gap-2">
          {timeSlots.map((time) => (
            <button
              key={time}
              onClick={() => setSelectedTime(time)}
              className={`rounded-2xl py-3 text-sm font-medium transition-colors ${
                selectedTime === time
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card text-foreground shadow-sm'
              }`}
            >
              {time}
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
            placeholder="Хаягаа оруулна уу"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-12 rounded-2xl border-border bg-card pl-12 shadow-sm"
          />
        </div>
      </div>

      {/* Price Calculation */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Дүн (2 цаг)</span>
          <span className="text-foreground">₮{subtotal.toLocaleString()}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Платформ хураамж (10%)</span>
          <span className="text-foreground">₮{platformFee.toLocaleString()}</span>
        </div>
        <div className="mt-3 border-t border-border pt-3 flex justify-between">
          <span className="font-semibold text-foreground">Нийт</span>
          <span className="font-bold text-primary text-lg">₮{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Төлбөрийн хэрэгсэл</h2>
        <div className="mt-3 flex gap-3">
          <button
            onClick={() => setPaymentMethod('qpay')}
            className={`flex-1 rounded-2xl py-4 text-center font-semibold transition-colors ${
              paymentMethod === 'qpay'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card text-foreground shadow-sm'
            }`}
          >
            QPay
          </button>
          <button
            onClick={() => setPaymentMethod('socialpay')}
            className={`flex-1 rounded-2xl py-4 text-center font-semibold transition-colors ${
              paymentMethod === 'socialpay'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-card text-foreground shadow-sm'
            }`}
          >
            SocialPay
          </button>
        </div>
      </div>

      {/* Safety Badge */}
      <div className="mt-6 mx-6 flex items-center gap-3 rounded-2xl bg-success/10 p-4">
        <Shield className="h-5 w-5 text-success" />
        <span className="text-sm font-medium text-success">Escrow-оор хамгаалагдсан</span>
      </div>

      {/* Confirm Button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md disabled:opacity-50"
        >
          Баталгаажуулах
        </Button>
      </div>
    </div>
  )
}
