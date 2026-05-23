'use client'

import { useState } from 'react'
import { Camera, MessageCircle, Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WorkerActiveScreenProps {
  onChat: () => void
  onComplete: () => void
}

const jobInfo = {
  customer: {
    name: 'Болормаа Б.',
    address: 'БЗД, 3-р хороо, Нарны зам 45, 301 тоот',
  },
  service: 'Цэвэрлэгээ',
}

export function WorkerActiveScreen({ onChat, onComplete }: WorkerActiveScreenProps) {
  const [beforePhotos, setBeforePhotos] = useState<string[]>([])
  const [afterPhotos, setAfterPhotos] = useState<string[]>([])

  const handleAddBeforePhoto = () => {
    if (beforePhotos.length < 3) {
      setBeforePhotos([...beforePhotos, `before-${beforePhotos.length + 1}`])
    }
  }

  const handleAddAfterPhoto = () => {
    if (afterPhotos.length < 3 && beforePhotos.length === 3) {
      setAfterPhotos([...afterPhotos, `after-${afterPhotos.length + 1}`])
    }
  }

  const canComplete = beforePhotos.length === 3 && afterPhotos.length === 3

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">
      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Идэвхтэй ажил</h1>
        <p className="text-sm text-muted-foreground">{jobInfo.service}</p>
      </div>

      {/* Customer Info */}
      <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">Захиалагч</p>
        <p className="mt-1 font-semibold text-foreground">{jobInfo.customer.name}</p>
        <p className="mt-2 text-sm text-muted-foreground">Хаяг</p>
        <p className="mt-1 text-sm text-foreground">{jobInfo.customer.address}</p>
      </div>

      {/* Before Photos */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Өмнөх зураг (3 шаардлагатай)</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => (
            <button
              key={`before-${index}`}
              onClick={handleAddBeforePhoto}
              disabled={beforePhotos.length <= index && beforePhotos.length !== index}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-colors ${
                beforePhotos.length > index
                  ? 'bg-success/10'
                  : beforePhotos.length === index
                  ? 'bg-primary/10 border-2 border-dashed border-primary'
                  : 'bg-card shadow-sm'
              }`}
            >
              {beforePhotos.length > index ? (
                <Check className="h-8 w-8 text-success" />
              ) : beforePhotos.length === index ? (
                <div className="text-center">
                  <Camera className="h-6 w-6 text-primary mx-auto" />
                  <span className="mt-1 text-xs text-primary">Нэмэх</span>
                </div>
              ) : (
                <Plus className="h-6 w-6 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* After Photos */}
      <div className="mt-6 px-6">
        <h2 className="font-semibold text-foreground">Дараах зураг (3 шаардлагатай)</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((index) => {
            const isLocked = beforePhotos.length < 3
            return (
              <button
                key={`after-${index}`}
                onClick={handleAddAfterPhoto}
                disabled={isLocked || (afterPhotos.length <= index && afterPhotos.length !== index)}
                className={`aspect-square rounded-2xl flex items-center justify-center transition-colors ${
                  isLocked
                    ? 'bg-muted/50'
                    : afterPhotos.length > index
                    ? 'bg-success/10'
                    : afterPhotos.length === index
                    ? 'bg-primary/10 border-2 border-dashed border-primary'
                    : 'bg-card shadow-sm'
                }`}
              >
                {isLocked ? (
                  <div className="text-center">
                    <Camera className="h-6 w-6 text-muted-foreground mx-auto" />
                    <span className="mt-1 text-xs text-muted-foreground">Түгжээтэй</span>
                  </div>
                ) : afterPhotos.length > index ? (
                  <Check className="h-8 w-8 text-success" />
                ) : afterPhotos.length === index ? (
                  <div className="text-center">
                    <Camera className="h-6 w-6 text-primary mx-auto" />
                    <span className="mt-1 text-xs text-primary">Нэмэх</span>
                  </div>
                ) : (
                  <Plus className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
            )
          })}
        </div>
        {beforePhotos.length < 3 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Эхлээд өмнөх зургуудаа оруулна уу
          </p>
        )}
      </div>

      {/* Chat Button */}
      <div className="mt-6 mx-6">
        <Button
          onClick={onChat}
          variant="outline"
          className="h-14 w-full rounded-2xl border-border bg-card font-semibold shadow-sm"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Захиалагчтай чатлах
        </Button>
      </div>

      {/* Complete Button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        <Button
          onClick={onComplete}
          disabled={!canComplete}
          className="h-14 w-full rounded-2xl bg-success font-semibold text-white shadow-md disabled:opacity-50 hover:bg-success/90"
        >
          <Check className="mr-2 h-5 w-5" />
          Ажил дуусгах
        </Button>
      </div>
    </div>
  )
}
