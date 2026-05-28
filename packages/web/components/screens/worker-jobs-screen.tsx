'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { MapPin, Clock, Check, X, Zap, CalendarDays, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import type { Order } from '@/lib/types'

interface WorkerJobsScreenProps {
  onAcceptJob: (jobId: string) => void
  onDeclineJob: (jobId: string) => void
  isWorker?: boolean
  activeMode?: 'user' | 'worker'
  onModeToggle?: (mode: 'user' | 'worker') => void
}

// ── Countdown hook ──────────────────────────────────────────
function useCountdown(seconds: number) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    if (remaining <= 0) return
    const t = setInterval(() => setRemaining((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [remaining])
  return remaining
}

// ── Individual instant-job card ─────────────────────────────
function InstantJobCard({
  job,
  onAccept,
  onDecline,
}: {
  job: Order
  onAccept: () => void
  onDecline: () => void
}) {
  const countdown = useCountdown(60)
  const expired   = countdown <= 0
  const urgent    = countdown <= 15

  // Mask full address to first segment (neighbourhood only)
  const maskedAddress = job.address.split(',')[0] ?? job.address

  return (
    <div className={`rounded-2xl bg-card p-4 shadow-sm transition-opacity ${expired ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              {job.service}
            </span>
            {job.urgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                <Zap className="h-3 w-3" /> Яаралтай
              </span>
            )}
          </div>
          <div className="mt-2 flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{maskedAddress}</p>
              <p className="text-xs text-muted-foreground">Дэлгэрэнгүй хаяг хүлээн авснаар харагдана</p>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {job.hours} цаг
            </span>
            {job.rooms && <span>{job.rooms} өрөө</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-primary">₮{job.totalAmount.toLocaleString()}</p>
          <div className={`mt-1 flex items-center justify-end gap-1 ${urgent ? 'text-destructive' : 'text-muted-foreground'}`}>
            <Clock className="h-3.5 w-3.5" />
            <span className="text-sm font-semibold tabular-nums">
              {expired ? 'Дууссан' : `${countdown}с`}
            </span>
          </div>
        </div>
      </div>

      {/* Countdown bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${urgent ? 'bg-destructive' : 'bg-accent'}`}
          style={{ width: `${Math.max(0, (countdown / 60) * 100)}%` }}
        />
      </div>

      <div className="mt-3 flex gap-3">
        <Button
          onClick={onDecline}
          disabled={expired}
          variant="outline"
          className="h-12 flex-1 rounded-2xl border-border bg-card font-semibold shadow-sm active:scale-95 transition-all"
        >
          <X className="mr-2 h-4 w-4" />
          Татгалзах
        </Button>
        <Button
          onClick={onAccept}
          disabled={expired}
          className="h-12 flex-1 rounded-2xl bg-success font-semibold text-white shadow-md hover:bg-success/90 active:scale-95 transition-all disabled:opacity-50"
        >
          <Check className="mr-2 h-4 w-4" />
          Авах
        </Button>
      </div>
    </div>
  )
}

// ── Scheduled job card ──────────────────────────────────────
function ScheduledJobCard({
  job,
  onAccept,
  accepted,
}: {
  job: Order
  onAccept: () => void
  accepted: boolean
}) {
  const scheduledLabel = job.scheduledDate
    ? `${job.scheduledDate.slice(0, 10)} · ${job.scheduledDate.slice(11, 16)}`
    : '—'

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {job.service}
            </span>
          </div>
          <div className="mt-2 flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{job.address.split(',')[0]}</p>
              <p className="text-xs text-muted-foreground">Дэлгэрэнгүй хаяг хүлээн авснаар харагдана</p>
              <a
                href={`https://maps.google.com/maps?q=${encodeURIComponent(job.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary active:scale-95 transition-all"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="flex-1">Чиглэл авах</span>
              </a>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {scheduledLabel}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {job.hours} цаг
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-primary">₮{job.totalAmount.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-3">
        {accepted ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-success/10 py-3">
            <Check className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-success">Санал илгээгдлээ</span>
          </div>
        ) : (
          <Button
            onClick={onAccept}
            className="h-11 w-full rounded-2xl bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          >
            Сонирхож байна
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Main screen ─────────────────────────────────────────────
export function WorkerJobsScreen({ onAcceptJob, onDeclineJob, isWorker = false, activeMode = 'worker', onModeToggle }: WorkerJobsScreenProps) {
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [acceptError, setAcceptError] = useState<string | null>(null)

  const { data: instantJobs = [], isLoading: loadingInstant, mutate: mutateInstant } = useSWR<Order[]>(
    '/api/orders?offered=1',
    fetcher,
    { refreshInterval: 5000 },
  )
  const { data: scheduledJobs = [], isLoading: loadingScheduled } = useSWR<Order[]>(
    '/api/orders?scheduled=1',
    fetcher,
    { refreshInterval: 5000 },
  )

  const handleDeclineInstant = async (jobId: string) => {
    void mutateInstant((prev = []) => prev.filter((j) => j.id !== jobId), { revalidate: false })
    try {
      const res = await fetch(`/api/orders/${jobId}/decline-instant`, { method: 'POST' })
      if (!res.ok) {
        // Decline failed — revalidate so the card reappears
        void mutateInstant()
      }
    } catch {
      void mutateInstant()
    }
  }

  const handleAcceptInstant = async (jobId: string) => {
    void mutateInstant((prev = []) => prev.filter((j) => String(j.id) !== String(jobId)), { revalidate: false })
    try {
      await fetch(`/api/orders/${jobId}/accept-instant`, { method: 'POST' })
    } catch { /* ignore; card already removed from UI */ }
    onAcceptJob(jobId)
  }

  const handleAcceptScheduled = async (orderId: string) => {
    setAcceptError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, { method: 'POST' })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (data.success) {
        setAcceptedIds((prev) => new Set([...prev, orderId]))
      } else {
        setAcceptError(data.error ?? 'Хүсэлт илгээхэд алдаа гарлаа.')
      }
    } catch {
      setAcceptError('Сүлжээний алдаа. Дахин оролдоно уу.')
    }
  }

  const hasInstant   = instantJobs.length > 0
  const hasScheduled = scheduledJobs.length > 0

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">

      {/* Header */}
      <div className="px-6 pt-12">
        <h1 className="text-xl font-bold text-foreground">Ажлын самбар</h1>

        {/* Mode toggle — always visible when is_worker */}
        {isWorker && (
          <div className="mt-4">
            <div className="flex rounded-2xl bg-card p-1 shadow-sm">
              {(['user', 'worker'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onModeToggle?.(m)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all active:scale-95 ${
                    activeMode === m
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'user' ? 'Хэрэглэгч' : 'Ажилтан'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <>
          {/* ── INSTANT SECTION ──────────────────────────── */}
          <div className="mt-6 px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <h2 className="font-semibold text-foreground">Яг одоо хүсэлтүүд</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">60 секундийн дотор хариулна уу</p>

            {loadingInstant ? (
              <div className="mt-3 space-y-3">
                {[1].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasInstant ? (
              <div className="mt-3 rounded-2xl bg-card p-6 shadow-sm text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">Шуурхай захиалга байхгүй</p>
                <p className="mt-1 text-xs text-muted-foreground">Захиалга ирэхэд мэдэгдэл ирнэ</p>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {instantJobs.map((job) => (
                  <InstantJobCard
                    key={job.id}
                    job={job}
                    onAccept={() => { void handleAcceptInstant(job.id) }}
                    onDecline={() => { void handleDeclineInstant(job.id) }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── SCHEDULED SECTION ────────────────────────── */}
          <div className="mt-8 px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground">Цаг товлох ажлууд</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Сонирхсон бол санал илгээгээрэй. Хэрэглэгч таныг сонговол мэдэгдэл ирнэ.
            </p>

            {loadingScheduled ? (
              <div className="mt-3 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !hasScheduled ? (
              <div className="mt-3 rounded-2xl bg-card p-6 shadow-sm text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto">
                  <CalendarDays className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">Цаг товлох захиалга байхгүй</p>
                <p className="mt-1 text-xs text-muted-foreground">Шинэ захиалга нийтлэгдэхэд энд харагдана</p>
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {scheduledJobs.map((job) => (
                  <ScheduledJobCard
                    key={job.id}
                    job={job}
                    accepted={acceptedIds.has(job.id)}
                    onAccept={() => { void handleAcceptScheduled(job.id) }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Rating reminder */}
          <div className="mt-6 mx-6 flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Star className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Үнэлгээгээ нэмэгдүүлэх</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                4.0-аас дээш үнэлгээтэй ажилтнуудад шуурхай хүсэлт очдог
              </p>
            </div>
          </div>
      </>

      {/* Accept error toast */}
      {acceptError && (
        <div className="fixed bottom-28 left-1/2 w-full max-w-[390px] -translate-x-1/2 px-6">
          <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive shadow-md">
            {acceptError}
          </div>
        </div>
      )}
    </div>
  )
}
