'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ArrowLeft, RefreshCw, Star, Clock, MapPin, Users, AlertCircle } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import type { Order } from '@/lib/types'

type Application = {
  id:                 string
  workerId:           string
  workerName:         string
  workerRating:       number
  workerReviewCount:  number
  workerSpecialty:    string
  workerPricePerHour: number
  appliedAt:          string
}

interface OrderApplicantsScreenProps {
  orderId: string
}

export function OrderApplicantsScreen({ orderId }: OrderApplicantsScreenProps) {
  const router = useRouter()

  const { data: order } = useSWR<Order>(
    `/api/orders/${orderId}`,
    fetcher,
  )

  const {
    data: appsData,
    isLoading: appsLoading,
    mutate: refreshApps,
    isValidating,
  } = useSWR<Application[]>(
    `/api/orders/${orderId}/applications`,
    fetcher,
    { refreshInterval: 5000 },
  )

  const applications = appsData ?? []

  const scheduledLabel = order
    ? `${order.scheduledDate.slice(0, 10)} · ${order.scheduledDate.slice(11, 16)}`
    : '—'

  const isAwaitingPayment = order?.status === 'awaiting_payment'

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 pt-12">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Ажилтнуудын санал</h1>
          <p className="text-xs text-muted-foreground">Захиалга нийтлэгдлээ</p>
        </div>
        <button
          onClick={() => { void refreshApps() }}
          disabled={isValidating}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm hover:bg-card/80 transition-colors active:scale-95"
        >
          <RefreshCw className={`h-5 w-5 text-primary ${isValidating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Order summary banner */}
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

      {/* Awaiting payment banner — shown if customer already selected but hasn't paid */}
      {isAwaitingPayment && order?.workerId && (
        <div className="mt-4 mx-6 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <AlertCircle className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-accent">Ажилтан сонгогдсон</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Төлбөрийг 30 минутын дотор хийнэ үү. Хугацаа дуусвал захиалга буцаад нийтлэгдэнэ.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => router.push(`/orders/${orderId}/applicants/${order.workerId}/confirm`)}
            className="h-9 shrink-0 rounded-2xl bg-accent text-xs font-semibold shadow-md hover:bg-accent/90 active:scale-95 transition-all"
          >
            Төлбөр хийх
          </Button>
        </div>
      )}

      {/* Applicant list */}
      <div className="mt-6 px-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Ажилтнуудын хариу</h2>
          {applications.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{applications.length}</span>
            </div>
          )}
        </div>

        {appsLoading ? (
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
        ) : applications.length === 0 ? (
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
            {applications.map((app) => (
              <div key={app.id} className="overflow-hidden rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {app.workerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-foreground">{app.workerName}</p>
                      <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                        ДАН
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{app.workerSpecialty}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                        <span className="text-sm font-medium text-foreground">{app.workerRating}</span>
                        <span className="text-xs text-muted-foreground">({app.workerReviewCount})</span>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        ₮{app.workerPricePerHour.toLocaleString()}/цаг
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => router.push(`/orders/${orderId}/applicants/${app.workerId}/confirm`)}
                  disabled={isAwaitingPayment}
                  className="mt-3 h-11 w-full rounded-2xl bg-accent text-sm font-semibold text-accent-foreground shadow-md hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-40"
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
