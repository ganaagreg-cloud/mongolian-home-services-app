'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DANSuccessScreenProps {
  onContinue: () => void
}

export function DANSuccessScreen({ onContinue }: DANSuccessScreenProps) {
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-8">
      {/* Success animation */}
      <div className="flex flex-col items-center">
        {/* Animated checkmark circle */}
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full bg-success transition-all duration-500 ${
            showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          <Check
            className={`h-14 w-14 text-white transition-all duration-300 delay-200 ${
              showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            strokeWidth={3}
          />
        </div>

        {/* Badge */}
        <div
          className={`mt-8 inline-flex items-center gap-2 rounded-full bg-success/10 px-5 py-2.5 transition-all duration-500 delay-300 ${
            showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <Check className="h-4 w-4 text-success" />
          <span className="text-sm font-semibold text-success">Баталгаажсан</span>
        </div>

        {/* User info */}
        <div
          className={`mt-8 text-center transition-all duration-500 delay-400 ${
            showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <h1 className="text-2xl font-bold text-foreground">Сайн байна уу!</h1>
          <p className="mt-2 text-lg text-muted-foreground">Батболд Дорж</p>
        </div>

        {/* Description */}
        <p
          className={`mt-6 max-w-xs text-center text-sm leading-relaxed text-muted-foreground transition-all duration-500 delay-500 ${
            showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Таны ДАН систем дэх мэдээлэл амжилттай баталгаажлаа. Та одоо үйлчилгээг ашиглах боломжтой.
        </p>
      </div>

      {/* Continue button */}
      <div
        className={`mt-auto w-full pb-4 transition-all duration-500 delay-600 ${
          showAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <Button
          onClick={onContinue}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
        >
          Үргэлжлүүлэх
        </Button>
      </div>
    </div>
  )
}
