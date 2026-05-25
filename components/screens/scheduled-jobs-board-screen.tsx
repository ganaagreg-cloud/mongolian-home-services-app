'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw, Star, Clock, MapPin, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order, OrderAcceptance } from '@/lib/types'

interface ScheduledJobsBoardScreenProps {
  orderId: string
  onWorkerPicked: (acceptance: OrderAcceptance) => void
  onBack: () => void
}

export function ScheduledJobsBoardScreen({
  orderId,
  onWorkerPicked,
  onBack,
}: ScheduledJobsBoardScreenProps) {
  const [order, setOrder]               = useState<Order | null>(null)
  const [acceptances, setAcceptances]   = useState<OrderAcceptance[]>([])
  const [loadingAcceptances, setLoadingAcceptances] = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch(`/api/orders/${orderId}`)
      .then((r) => r.json())
      .then((d: { success: boolean; data?: Order }) => { if (d.success && d.data) setOrder(d.data) })
      .catch(() => {})
  }, [orderId])

  const fetchAcceptances = async (quiet = false) => {
    if (!quiet) setLoadingAcceptances(true)
    try {
      const r = await fetch(`/api/orders/${orderId}/acceptances`)
      const d = (await r.json()) as { success: boolean; data?: OrderAcceptance[] }
      if (d.success && d.data) setAcceptances(d.data)
    } catch {
      // silently fail
    } finally {
      setLoadingAcceptances(false)
    }
  }

  useEffect(() => {
    void fetchAcceptances()
    // Poll every 5 seconds for new acceptances
    intervalRef.current = setInterval(() => { void fetchAcceptances(true) }, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAcceptances()
    setRefreshing(false)
  }

  const scheduledLabel = order
    ? `${order.scheduledDate.slice(0, 10)} · ${order.scheduledDate.slice(11, 16)}`
    : '—'

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Ажилтнуудын санал</h1>
          <p className="text-xs text-muted-foreground">Захиалга нийтлэгдлээ</p>
        </div>
        <button
          onClick={() => { void handleRefresh() }}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <RefreshCw className={`h-5 w-5 text-primary ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Posted order summary */}
      {order ? (
        <div className="mt-6 mx-6 rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-4 shadow-lg">
          <p className="text-xs font-medium text-primary-foreground/70">Таны захиалга</p>
          <p className="mt-1 text-lg font-bold text-primary-foreground">{order.service}</p>
          <div className="mt-2 flex items-center gap-4 text-sm text-primary-foreground/80">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{scheduledLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate max-w-[140px]">{order.address.split(',')[0]}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-primary-foreground/70 text-xs">Нийт төлбөр</span>
            <span className="text-xl font-bold text-primary-foreground">
              ₮{order.totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-6 mx-6 h-28 rounded-2xl bg-card animate-pulse shadow-sm" />
      )}

      {/* Acceptances section */}
      <div className="mt-6 px-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Ажилтнуудын хариу</h2>
          {acceptances.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{acceptances.length}</span>
            </div>
          )}
        </div>

        {loadingAcceptances ? (
          <div className="mt-4 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : acceptances.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl bg-card py-12 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <div className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground" />
            </div>
            <p className="mt-4 font-medium text-foreground">Ажилтнуудын хариуг хүлээж байна</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ажилтнуудад захиалга харагдаж байна. Хэдхэн минутын дараа санал ирнэ.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Хуудас автоматаар шинэчлэгдэнэ · 5 секунд тутамд
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {acceptances.map((a) => (
              <div key={a.id} className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {a.workerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{a.workerName}</p>
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                        ДАН
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.workerSpecialty}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="text-sm font-medium text-foreground">{a.workerRating}</span>
                        <span className="text-xs text-muted-foreground">({a.workerReviewCount})</span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        ₮{a.workerPricePerHour.toLocaleString()}/цаг
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => onWorkerPicked(a)}
                  className="mt-3 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-foreground shadow-md hover:bg-accent/90 active:scale-95 transition-all"
                >
                  Сонгох
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 mx-6 rounded-2xl bg-card p-4 shadow-sm">
        <p className="text-center text-xs text-muted-foreground">
          Ажилтныг сонгосны дараа та төлбөрийн дэлгэц рүү шилжинэ. Төлбөр амжилттай болсны дараа л захиалга батлагдана.
        </p>
      </div>
    </div>
  )
}
