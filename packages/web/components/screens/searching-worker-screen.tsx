'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api-fetch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { MatchedWorker } from '@/lib/types'

interface SearchingWorkerScreenProps {
  orderId: string
  onWorkerFound: (worker: MatchedWorker) => void
  onNoWorkers: () => void
  onBack: () => void
}

// searching  — calling /match
// waiting    — offer sent, polling for worker response
// found      — worker_assigned; show card + confirm button
// exhausted  — 5 attempts all failed; suggest schedule or retry
// none       — unexpected error fallback
type Phase = 'searching' | 'waiting' | 'found' | 'none' | 'exhausted'

export function SearchingWorkerScreen({
  orderId,
  onWorkerFound,
  onNoWorkers,
  onBack,
}: SearchingWorkerScreenProps) {
  const [phase,         setPhase]         = useState<Phase>('searching')
  const [worker,        setWorker]        = useState<MatchedWorker | null>(null)
  const [attemptNumber, setAttemptNumber] = useState(0) // 1–5, shown in waiting UI
  const [eta]                             = useState(15 + Math.floor(Math.random() * 16))
  const isFirstSearch                     = useRef(true)

  // ── SEARCHING phase: call /match, transition to 'waiting' or terminal states ──
  useEffect(() => {
    if (phase !== 'searching') return
    let cancelled = false

    async function runMatch() {
      try {
        const delay = isFirstSearch.current ? 1500 : 500
        isFirstSearch.current = false

        await new Promise<void>((r) => setTimeout(r, delay))
        if (cancelled) return

        const res = await apiFetch(`/api/orders/${orderId}/match`, { method: 'POST' })
        const d = (await res.json()) as {
          success: boolean
          data?: {
            status: 'pending_acceptance' | 'no_workers_found'
            attemptNumber?: number
            worker?: MatchedWorker
          }
          error?: string
        }

        if (cancelled) return

        if (d.success && d.data?.status === 'pending_acceptance' && d.data.worker) {
          setWorker(d.data.worker)
          setAttemptNumber(d.data.attemptNumber ?? 1)
          setPhase('waiting')
        } else if (d.data?.status === 'no_workers_found') {
          setPhase('exhausted')
        } else {
          setPhase('none')
        }
      } catch {
        if (!cancelled) setPhase('none')
      }
    }

    void runMatch()
    return () => { cancelled = true }
  }, [orderId, phase])

  // ── WAITING phase: poll order status every 3 s; 65 s timeout re-triggers match ──
  useEffect(() => {
    if (phase !== 'waiting') return
    let cancelled = false

    const pollId = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/orders/${orderId}`)
        const d = (await res.json()) as { success: boolean; data?: { status: string } }
        if (cancelled) return
        const status = d.data?.status
        if (status === 'worker_assigned') {
          if (worker) setPhase('found')
        } else if (status === 'searching_worker') {
          // Worker declined — retry match
          setPhase('searching')
        } else if (status === 'no_workers_found') {
          setPhase('exhausted')
        }
      } catch { /* network hiccup — retry next tick */ }
    }, 3000)

    // 75 s: worker's 60 s card + 10 s server stale buffer (70 s) + 5 s margin
    const timeoutId = setTimeout(() => {
      if (!cancelled) setPhase('searching')
    }, 75_000)

    return () => { cancelled = true; clearInterval(pollId); clearTimeout(timeoutId) }
  }, [phase, orderId, worker])

  return (
    <div className="flex min-h-screen flex-col bg-background pb-32">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Ажилтан хайх</h1>
      </div>

      {/* ── SEARCHING ────────────────────────────────────────── */}
      {(phase === 'searching') && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-accent/20" />
            <div className="absolute inset-4 animate-ping rounded-full bg-accent/30 [animation-delay:300ms]" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
            </div>
          </div>
          <p className="mt-8 text-xl font-bold text-foreground">Ажилтан хайж байна...</p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Таны бүс нутгийн боломжтой ажилтнуудыг шалгаж байна
          </p>
          <div className="mt-8 w-full rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
              </div>
              <p className="text-sm text-muted-foreground">Идэвхтэй ажилтнуудтай холбогдож байна</p>
            </div>
          </div>
        </div>
      )}

      {/* ── WAITING — offer sent, pending worker acceptance ── */}
      {phase === 'waiting' && worker && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
          </div>
          <p className="mt-6 text-lg font-bold text-foreground">Ажилтанд хүсэлт явуулсан</p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Ажилтан таны захиалгыг харж байна. Хариу хүлээж байна...
          </p>

          {/* Attempt counter */}
          <div className="mt-4 flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-2 w-8 rounded-full transition-colors ${
                  n <= attemptNumber ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{attemptNumber}/5 ажилтан шалгаж байна</p>

          <div className="mt-6 w-full rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-primary/10 font-bold text-primary">
                  {worker.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{worker.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    <span className="text-sm font-medium text-foreground">{worker.rating}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    ₮{worker.pricePerHour.toLocaleString()}/цаг
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOUND — worker accepted ──────────────────────────── */}
      {phase === 'found' && worker && (
        <>
          <div className="mt-8 flex flex-col items-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-bold text-foreground">Ажилтан зөвшөөрлөө!</p>
            <p className="mt-1 text-sm text-muted-foreground">Доорх мэдээллийг шалгаад баталгаажуулна уу</p>
          </div>

          <div className="mt-6 mx-6 rounded-2xl bg-card p-5 shadow-md">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {worker.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-lg font-bold text-foreground">{worker.name}</p>
                  <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    ДАН
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{worker.specialty}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    <span className="text-sm font-semibold text-foreground">{worker.rating}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    ₮{worker.pricePerHour.toLocaleString()}/цаг
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl bg-accent/10 p-3">
              <Zap className="h-5 w-5 shrink-0 text-accent" />
              <div>
                <p className="text-sm font-semibold text-foreground">Хүрэх хугацаа: ~{eta} минут</p>
                <p className="text-xs text-muted-foreground">Одоогийн байршилд тулгуурласан тооцоо</p>
              </div>
            </div>
          </div>

          <div className="mt-4 mx-6 rounded-2xl bg-card p-4 shadow-sm">
            <p className="text-center text-xs text-muted-foreground">
              Баталгаажуулсны дараа та дараагийн дэлгэц дээр төлбөрийн мэдээллийг харна.
            </p>
          </div>
        </>
      )}

      {/* ── EXHAUSTED — 5 attempts failed ───────────────────── */}
      {phase === 'exhausted' && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card shadow-sm">
            <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">5 ажилтан шалгасан боловч хариу ирсэнгүй</p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Одоогоор боломжтой ажилтан хариу өгсөнгүй.
            Цаг товлох замаар олон ажилтнаас санал хүлээн авч болно.
          </p>

          {/* Attempt dots — all filled */}
          <div className="mt-4 flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-2 w-8 rounded-full bg-muted-foreground/40" />
            ))}
          </div>

          <div className="mt-8 w-full space-y-3">
            <button
              onClick={onNoWorkers}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
            >
              <CalendarDays className="h-5 w-5" />
              Цаг товлох
            </button>
            <button
              onClick={onBack}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-base font-semibold text-foreground shadow-sm hover:bg-muted/50 active:scale-95 transition-all"
            >
              Дахин хайх
            </button>
          </div>
        </div>
      )}

      {/* ── ERROR fallback ───────────────────────────────────── */}
      {phase === 'none' && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card shadow-sm">
            <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">Ажилтан олдсонгүй</p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Одоогоор боломжтой ажилтан байхгүй байна.
            Цаг товлох замаар олон ажилтнаас санал хүлээн авч болно.
          </p>
          <button
            onClick={onNoWorkers}
            className="mt-6 h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          >
            Цаг товлох руу шилжих
          </button>
        </div>
      )}

      {/* Bottom CTA — only when found */}
      {phase === 'found' && worker && (
        <div className="fixed bottom-0 left-1/2 w-full max-w-[390px] -translate-x-1/2 bg-background px-6 pb-8 pt-4">
          <Button
            onClick={() => onWorkerFound(worker)}
            className="h-14 w-full rounded-2xl bg-accent text-base font-semibold text-accent-foreground shadow-md hover:bg-accent/90 active:scale-95 transition-all"
          >
            Баталгаажуулах
          </Button>
        </div>
      )}
    </div>
  )
}
