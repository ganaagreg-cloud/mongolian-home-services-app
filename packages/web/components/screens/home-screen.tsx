'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Bell, Search, Star, BadgeCheck, ArrowRight, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandMark } from '@/components/brand-mark'
import { ModeToggle } from '@/components/mode-toggle'
import { fetcher } from '@/lib/fetcher'
import { serviceIcon, serviceTone, personTone } from '@/lib/service-tone'
import { statusConfig, orderHref } from '@/lib/order-status'
import { cn } from '@/lib/utils'
import { useSession } from '@/context/session-context'
import type { Order, Worker } from '@/lib/types'

type ServiceType = { id: number; name_mn: string; icon: string }

// Greeting depends on the viewer's clock, so it is resolved after mount to keep
// server and client markup identical.
function useGreeting(): string {
  const [greeting, setGreeting] = useState('Сайн байна уу')
  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h >= 5 && h < 12 ? 'Өглөөний мэнд' : h >= 12 && h < 18 ? 'Өдрийн мэнд' : 'Оройн мэнд')
  }, [])
  return greeting
}

export function HomeScreen() {
  const session = useSession()
  const greeting = useGreeting()
  const firstName = session?.name?.split(' ')[0] ?? ''

  const { data: serviceTypes } = useSWR<ServiceType[]>('/api/service-types', fetcher)
  const { data: featuredWorkers, isLoading: workersLoading } = useSWR<Worker[]>('/api/workers?sort=rating', fetcher)
  const { data: activeOrder } = useSWR<Order | null>('/api/orders?active=1', fetcher)
  const { data: badgeData } = useSWR<{ count: number }>('/api/notifications/badge', fetcher, { refreshInterval: 30000 })
  const notifCount = badgeData?.count ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-background pb-28">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-5 pt-12">
        <BrandMark />
        {session?.isWorker ? (
          <ModeToggle />
        ) : (
          <span className="text-[17px] font-extrabold tracking-tight text-foreground">HomeService</span>
        )}
        <div className="flex-1" />
        <Link
          href="/notifications"
          aria-label={notifCount > 0 ? `Мэдэгдэл, ${notifCount} шинэ` : 'Мэдэгдэл'}
          className="pressable relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-card shadow-card"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {notifCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-background bg-highlight px-1 text-[10px] font-extrabold text-highlight-foreground">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </Link>
      </header>

      {/* Greeting */}
      <section className="stagger-item mt-6 px-5" style={{ '--i': 0 } as CSSProperties}>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-foreground">
          {greeting}{firstName && <>, <span className="whitespace-nowrap">{firstName}</span></>}
        </h1>
        <p className="mt-1 text-[15px] font-semibold text-muted-foreground">Өнөөдөр юугаар туслах вэ?</p>
      </section>

      {/* Entry point into the booking flow */}
      <div className="stagger-item mt-4 px-5" style={{ '--i': 1 } as CSSProperties}>
        <Link
          href="/orders/new"
          className="pressable flex h-[54px] items-center gap-3 rounded-[18px] bg-card px-4 shadow-card"
        >
          <Search className="h-5 w-5 text-primary" />
          <span className="flex-1 text-[15px] font-medium text-muted-foreground">Ямар үйлчилгээ хэрэгтэй вэ?</span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Hero: the live order when there is one, otherwise the first-order offer */}
      <div className="stagger-item mt-4 px-5" style={{ '--i': 2 } as CSSProperties}>
        {activeOrder ? <ActiveOrderCard order={activeOrder} /> : <OfferCard />}
      </div>

      {/* Services */}
      <section className="stagger-item mt-7 px-5" style={{ '--i': 3 } as CSSProperties}>
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">Үйлчилгээ</h2>
        <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4">
          {!serviceTypes
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-16 w-16 rounded-[22px]" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))
            : serviceTypes.map((service) => {
                const Icon = serviceIcon(service.icon)
                const tone = serviceTone(service.icon)
                return (
                  <Link
                    key={service.id}
                    href={`/orders/new?service=${service.id}`}
                    className="pressable flex flex-col items-center gap-2"
                  >
                    <span className={cn('flex h-16 w-16 items-center justify-center rounded-[22px]', tone.tile)}>
                      <Icon className={cn('h-[26px] w-[26px]', tone.icon)} strokeWidth={1.9} />
                    </span>
                    <span className="text-center text-xs font-bold leading-tight text-foreground">{service.name_mn}</span>
                  </Link>
                )
              })}
        </div>
      </section>

      {/* Top workers — display only; booking auto-matches the nearest available worker */}
      <section className="stagger-item mt-7" style={{ '--i': 4 } as CSSProperties}>
        <div className="px-5">
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">Шилдэг ажилтнууд</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Захиалга үүсгэхэд хамгийн ойр ажилтантай автоматаар холбоно
          </p>
        </div>
        <div className="scrollbar-hide mt-3 flex min-h-[84px] gap-3 overflow-x-auto px-5 pb-2">
          {workersLoading
            ? [1, 2].map((i) => (
                <div key={i} className="flex w-[244px] shrink-0 items-center gap-3 rounded-[22px] bg-card p-3.5 shadow-card">
                  <Skeleton className="h-[52px] w-[52px] rounded-[18px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            : (featuredWorkers ?? []).slice(0, 6).map((worker) => <WorkerChip key={worker.id} worker={worker} />)}
        </div>
      </section>
    </div>
  )
}

function ActiveOrderCard({ order }: { order: Order }) {
  const status = statusConfig[order.status]
  return (
    <Link
      href={orderHref(order)}
      className="pressable block rounded-3xl bg-primary p-[18px] text-primary-foreground shadow-brand"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-highlight-on-primary">Идэвхтэй захиалга</span>
        <span className="flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-bold">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-highlight" />
          {status.label}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15 text-[17px] font-extrabold">
          {(order.workerName ?? order.service)[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold">{order.workerName ?? order.service}</p>
          <p className="truncate text-sm text-primary-foreground/80">
            {order.service} · {order.scheduledDate.slice(0, 10)}
          </p>
        </div>
        <span className="flex h-10 items-center gap-1.5 rounded-[14px] bg-card px-3.5 text-sm font-extrabold text-primary">
          Харах
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

function OfferCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-primary p-[18px] text-primary-foreground shadow-brand">
      <span aria-hidden="true" className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[28px] border-primary-foreground/[0.07]" />
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-highlight-on-primary">Шинэ хэрэглэгчдэд</p>
      <p className="mt-2 max-w-[250px] text-xl font-extrabold leading-snug">Анхны захиалгадаа 20% хөнгөлөлт</p>
      <Link
        href="/orders/new"
        className="pressable mt-4 inline-flex h-11 items-center gap-2 rounded-[14px] bg-card px-4 text-sm font-extrabold text-primary-strong"
      >
        Захиалга үүсгэх
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function WorkerChip({ worker }: { worker: Worker }) {
  const tone = personTone(worker.name)
  return (
    <div className="flex w-[244px] shrink-0 items-center gap-3 rounded-[22px] bg-card p-3.5 shadow-card">
      <span className={cn('flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] text-lg font-extrabold', tone.tile, tone.icon)}>
        {worker.name[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[15px] font-extrabold text-foreground">{worker.name}</p>
          {worker.danVerified && <BadgeCheck aria-label="ДАН баталгаажсан" className="h-4 w-4 shrink-0 fill-primary text-primary-foreground" />}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-highlight text-highlight" />
          <span className="font-bold text-foreground">{worker.rating.toFixed(1)}</span>
          <span>({worker.reviewCount})</span>
          {worker.specialty && <span className="truncate">· {worker.specialty}</span>}
        </div>
      </div>
    </div>
  )
}
