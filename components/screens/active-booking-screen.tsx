'use client'

import { MessageCircle, Phone, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ActiveBookingScreenProps {
  onChat: () => void
  onSOS: () => void
  onBack: () => void
}

const bookingInfo = {
  worker: {
    name: 'Батболд Д.',
    phone: '+976 9911 2233',
    image: '',
  },
  service: 'Цэвэрлэгээ',
  status: 'arriving' as const, // 'waiting' | 'arriving' | 'working' | 'completed'
  address: 'БЗД, 3-р хороо, Нарны зам, 45-р байр',
  eta: '10 мин',
}

const statusSteps = [
  { id: 'waiting', label: 'Хүлээж байна' },
  { id: 'arriving', label: 'Ирж байна' },
  { id: 'working', label: 'Ажиллаж байна' },
  { id: 'completed', label: 'Дууслаа' },
]

export function ActiveBookingScreen({ onChat, onSOS, onBack }: ActiveBookingScreenProps) {
  const currentStepIndex = statusSteps.findIndex(s => s.id === bookingInfo.status)

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Идэвхтэй захиалга</h1>
        <p className="text-sm text-muted-foreground">{bookingInfo.service}</p>
      </div>

      {/* Worker Card */}
      <div className="mt-6 mx-6 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <Avatar className="h-16 w-16">
          <AvatarImage src={bookingInfo.worker.image} />
          <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
            {bookingInfo.worker.name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{bookingInfo.worker.name}</p>
          <p className="text-sm text-muted-foreground">{bookingInfo.worker.phone}</p>
          <div className="mt-1 flex items-center gap-1">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
              {bookingInfo.eta}
            </span>
          </div>
        </div>
        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Phone className="h-5 w-5 text-primary" />
        </button>
      </div>

      {/* Address */}
      <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Хаяг</p>
        <p className="mt-1 font-medium text-foreground">{bookingInfo.address}</p>
      </div>

      {/* Progress Timeline */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold text-foreground">Явц</h2>
        <div className="mt-4 space-y-4">
          {statusSteps.map((step, index) => {
            const isCompleted = index < currentStepIndex
            const isCurrent = index === currentStepIndex
            const isPending = index > currentStepIndex

            return (
              <div key={step.id} className="flex items-center gap-4">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isCompleted
                      ? 'bg-success text-white'
                      : isCurrent
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={`font-medium ${
                    isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
                {isCurrent && (
                  <span className="ml-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    Одоо
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat Button */}
      <div className="mt-4 mx-6">
        <Button
          onClick={onChat}
          variant="outline"
          className="h-14 w-full rounded-2xl border-border bg-card text-base font-semibold shadow-sm"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Чат бичих
        </Button>
      </div>

      {/* SOS Button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={onSOS}
          className="h-14 w-full rounded-2xl bg-destructive text-base font-bold text-white shadow-md hover:bg-destructive/90"
        >
          <AlertTriangle className="mr-2 h-5 w-5" />
          SOS - Яаралтай тусламж
        </Button>
      </div>
    </div>
  )
}
