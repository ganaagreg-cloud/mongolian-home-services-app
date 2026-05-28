'use client'

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-[390px] space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <WifiOff className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Интернэт холболт байхгүй</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Та одоогоор офлайн байна. Интернэт холболтоо шалгаад дахин оролдоно уу.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md transition-all active:scale-95 hover:bg-primary/90"
        >
          Дахин оролдох
        </button>
      </div>
    </div>
  )
}
