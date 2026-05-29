'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { AlertTriangle, MapPin, Shield, X } from 'lucide-react'

interface SosButtonProps {
  orderId?: string
  // Tailwind bottom-* class — lift above a fixed footer when needed (e.g. 'bottom-28')
  bottomClass?: string
}

type Phase = 'idle' | 'confirming' | 'sending' | 'active'

export function SosButton({ orderId, bottomClass = 'bottom-6' }: SosButtonProps) {
  const [phase, setPhase]     = useState<Phase>('idle')
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const [alertId, setAlertId] = useState<number | null>(null)

  const handleConfirm = async () => {
    setPhase('sending')

    let lat: number | undefined
    let lng: number | undefined
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }),
      )
      lat = pos.coords.latitude
      lng = pos.coords.longitude
      setCoords({ lat, lng })
    } catch { /* proceed without location */ }

    try {
      const res = await apiFetch('/api/sos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId, latitude: lat, longitude: lng }),
      })
      const d = (await res.json()) as { success: boolean; data?: { alertId: number } }
      if (d.success && d.data) setAlertId(d.data.alertId)
    } catch { /* show overlay regardless */ }

    setPhase('active')
  }

  const handleDismiss = () => {
    setPhase('idle')
    setCoords(null)
    setAlertId(null)
  }

  return (
    <>
      {/* Floating FAB — constrained within the 390px container */}
      {phase === 'idle' && (
        <div className={`fixed ${bottomClass} left-1/2 -translate-x-1/2 z-40 w-full max-w-[390px] flex justify-end pr-4 pointer-events-none`}>
          <button
            onClick={() => setPhase('confirming')}
            className="pointer-events-auto flex h-16 w-16 flex-col items-center justify-center rounded-full bg-destructive shadow-lg active:scale-95 transition-all"
          >
            <AlertTriangle className="h-5 w-5 text-white" />
            <span className="text-[11px] font-bold text-white leading-none mt-0.5">SOS</span>
          </button>
        </div>
      )}

      {/* Confirmation sheet */}
      {phase === 'confirming' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-[390px] rounded-t-3xl bg-background px-6 pb-10 pt-6">
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-border" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="mt-4 text-center text-xl font-bold text-foreground">SOS дуудлага</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Яаралтай тусламж дуудах гэж байна. Таны байршил мэдэгдэх болно.
            </p>
            <button
              onClick={() => { void handleConfirm() }}
              className="mt-6 h-14 w-full rounded-2xl bg-destructive text-base font-bold text-white shadow-md active:scale-95 transition-all"
            >
              Тийм, тусламж дуу
            </button>
            <button
              onClick={() => setPhase('idle')}
              className="mt-3 h-14 w-full rounded-2xl bg-card text-base font-semibold text-foreground shadow-sm active:scale-95 transition-all"
            >
              Болих
            </button>
          </div>
        </div>
      )}

      {/* Sending transition */}
      {phase === 'sending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-destructive/95">
          <p className="text-lg font-semibold text-white">Дуудаж байна...</p>
        </div>
      )}

      {/* Active SOS full-screen overlay */}
      {phase === 'active' && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-destructive">
          <div className="flex flex-col items-center px-8 text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/20 animate-pulse">
              <Shield className="h-14 w-14 text-white" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-white">SOS Идэвхтэй</h1>
            <p className="mt-3 text-lg font-semibold text-white/90">Яаралтай тусламж дуудагдлаа</p>

            {coords && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/20 px-4 py-2">
                <MapPin className="h-4 w-4 text-white" />
                <span className="text-sm text-white">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
              </div>
            )}

            {alertId !== null && (
              <p className="mt-3 text-sm text-white/70">Дуудлага #{alertId}</p>
            )}

            <p className="mt-6 text-sm leading-relaxed text-white/80">
              Манай тусламжийн баг таньд удахгүй хүрэх болно.{'\n'}Аюулгүй байрлалд байна уу.
            </p>
          </div>

          {/* Dismiss — upper-right corner */}
          <button
            onClick={handleDismiss}
            className="absolute right-6 top-12 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 active:scale-95 transition-all"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      )}
    </>
  )
}
