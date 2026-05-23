'use client'

import { useState } from 'react'
import { Shield, ArrowRight, Smartphone, CheckCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OnboardingScreenProps {
  onComplete: () => void
}

const slides = [
  {
    title: 'Аюулгүй байдал',
    description: 'Таны мэдээлэл болон төлбөр бүрэн хамгаалагдсан. Бид таны аюулгүй байдлыг нэн тэргүүнд тавьдаг.',
    icon: Shield,
  },
  {
    title: 'Хэрхэн ажилладаг',
    steps: [
      { icon: Smartphone, text: 'Үйлчилгээ сонгох' },
      { icon: CheckCircle, text: 'Захиалга өгөх' },
      { icon: Zap, text: 'Хурдан гүйцэтгэл' },
    ],
  },
  {
    title: 'Эхлэх',
    description: 'Манай платформд нэгдэж, гэрийн үйлчилгээний шинэ туршлагыг мэдрээрэй.',
    cta: true,
  },
]

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const slide = slides[currentSlide]

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      {/* Skip button */}
      <div className="flex justify-end">
        <button
          onClick={onComplete}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Алгасах
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {/* Slide 1: Safety */}
        {currentSlide === 0 && slide.icon && (
          <>
            <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
              <slide.icon className="h-16 w-16 text-primary" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-foreground">{slide.title}</h1>
            <p className="max-w-xs text-muted-foreground leading-relaxed">{slide.description}</p>
          </>
        )}

        {/* Slide 2: How it works */}
        {currentSlide === 1 && 'steps' in slide && (
          <>
            <h1 className="mb-10 text-2xl font-bold text-foreground">{slide.title}</h1>
            <div className="flex flex-col gap-6">
              {slide.steps?.map((step, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="text-base font-medium text-foreground">{step.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Slide 3: Get started */}
        {currentSlide === 2 && (
          <>
            <div className="mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
              <ArrowRight className="h-16 w-16 text-primary" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-foreground">{slide.title}</h1>
            <p className="max-w-xs text-muted-foreground leading-relaxed">{slide.description}</p>
          </>
        )}
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center gap-6 pb-4">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={nextSlide}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
        >
          {currentSlide === slides.length - 1 ? 'Эхлэх' : 'Үргэлжлүүлэх'}
        </Button>
      </div>
    </div>
  )
}
