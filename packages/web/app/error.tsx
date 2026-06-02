'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-screen max-w-[390px] flex-col items-center justify-center gap-4 px-6">
      <p className="text-center text-sm text-muted-foreground">
        Алдаа гарлаа. Дахин оролдоно уу.
      </p>
      <Button onClick={reset} variant="outline" className="rounded-2xl">
        Дахин оролдох
      </Button>
    </main>
  )
}
