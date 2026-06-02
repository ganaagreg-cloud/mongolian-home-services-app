'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error('[orders/confirm-scheduled]', error) }, [error])
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <p className="text-center text-sm text-muted-foreground">Захиалга олдсонгүй. Дахин оролдоно уу.</p>
      <Button onClick={reset} variant="outline" className="rounded-2xl">Дахин оролдох</Button>
    </main>
  )
}
