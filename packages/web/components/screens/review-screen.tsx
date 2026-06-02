'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Home, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import { Textarea } from '@/components/ui/textarea'

interface ReviewScreenProps {
  orderId?: string
}

export function ReviewScreen({ orderId }: ReviewScreenProps) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (rating === 0) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      if (orderId) {
        const res = await apiFetch(`/api/orders/${orderId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, comment: comment || undefined }),
        })
        const data = (await res.json()) as { success: boolean; error?: string }
        if (!data.success) {
          setSubmitError(data.error ?? 'Үнэлгээ илгээхэд алдаа гарлаа')
          return
        }
      }
      setSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <Star className="h-10 w-10 fill-success text-success" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">Баярлалаа!</h1>
        <p className="mt-2 text-center text-muted-foreground">
          Таны үнэлгээ амжилттай илгээгдлээ
        </p>
        <div className="mt-8 flex w-full gap-3">
          <Button
            onClick={() => router.push('/orders/new')}
            variant="outline"
            className="h-14 flex-1 rounded-2xl border-border bg-card font-semibold shadow-sm active:scale-95 transition-all"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Дахин захиалах
          </Button>
          <Button
            onClick={() => router.push('/home')}
            className="h-14 flex-1 rounded-2xl bg-primary font-semibold shadow-md active:scale-95 transition-all"
          >
            <Home className="mr-2 h-5 w-5" />
            Нүүр хуудас
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-32">
      {/* Header */}
      <div className="pt-12 text-center">
        <h1 className="text-2xl font-bold text-foreground">Ажил дууслаа!</h1>
        <p className="mt-2 text-muted-foreground">Ажилтны ажлыг үнэлнэ үү</p>
      </div>

      {/* Before/After Comparison */}
      <div className="mt-8">
        <h2 className="font-semibold text-foreground">Өмнө / Дараа</h2>
        <div className="mt-3 flex gap-3">
          <div className="flex-1">
            <div className="aspect-square rounded-2xl bg-card shadow-sm flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Өмнө</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="aspect-square rounded-2xl bg-card shadow-sm flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Дараа</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-8 text-center">
        <h2 className="font-semibold text-foreground">Үнэлгээ өгөх</h2>
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`h-10 w-10 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-accent text-accent'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {rating === 0
            ? 'Одыг дарж үнэлнэ үү'
            : rating <= 2
            ? 'Муу'
            : rating === 3
            ? 'Дунд'
            : rating === 4
            ? 'Сайн'
            : 'Маш сайн!'}
        </p>
      </div>

      {/* Comment */}
      <div className="mt-8">
        <h2 className="font-semibold text-foreground">Сэтгэгдэл</h2>
        <Textarea
          placeholder="Сэтгэгдэлээ бичнэ үү..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-3 min-h-[120px] rounded-2xl border-border bg-card shadow-sm resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
        {submitError && (
          <p className="mb-3 rounded-2xl bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button
          onClick={() => { void handleSubmit() }}
          disabled={rating === 0 || isSubmitting}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold shadow-md disabled:opacity-50 active:scale-95 transition-all"
        >
          {isSubmitting ? 'Илгээж байна...' : 'Үнэлгээ илгээх'}
        </Button>
      </div>
    </div>
  )
}
