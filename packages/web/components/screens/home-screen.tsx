'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  Bell, Sparkles, Droplets, Zap, Wrench, Paintbrush, Wind,
  Star, ChevronRight, Hammer, Truck, WashingMachine, type LucideIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { fetcher } from '@/lib/fetcher'
import { useSession } from '@/context/session-context'
import type { Worker } from '@/lib/types'

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  droplets: Droplets,
  zap:      Zap,
  wrench:   Wrench,
  paintbrush: Paintbrush,
  wind:     Wind,
  hammer:   Hammer,
  truck:    Truck,
  'washing-machine': WashingMachine,
}

type ServiceType = { id: number; name_mn: string; icon: string }

interface HomeScreenProps {
  onActiveBookingClick?: () => void
  isWorker?: boolean
  activeMode?: 'user' | 'worker'
  onModeToggle?: (mode: 'user' | 'worker') => void
}

export function HomeScreen({
  onActiveBookingClick,
  isWorker = false,
  activeMode = 'user',
  onModeToggle,
}: HomeScreenProps) {
  const session = useSession()
  const router = useRouter()
  const userName = session?.name ?? '...'
  const onCreateOrder = (serviceId: number) => router.push(`/orders/new?service=${serviceId}`)
  // hasActiveBooking detection deferred — wired to real order state in a future sprint
  const hasActiveBooking = false
  const { data: featuredWorkers, isLoading } = useSWR<Worker[]>(
    '/api/workers?sort=rating',
    fetcher,
  )
  const { data: serviceTypesData } = useSWR<ServiceType[]>(
    '/api/service-types',
    fetcher,
  )
  const categories = serviceTypesData ?? []
  const { data: badgeData } = useSWR<{ count: number }>(
    '/api/notifications/badge',
    fetcher,
    { refreshInterval: 30000 },
  )
  const notifCount = badgeData?.count ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Сайн байна уу, {userName} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Өнөөдөр юу хийх вэ?</p>
        </div>
        <button
          onClick={() => router.push('/notifications')}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm active:scale-95 transition-all"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {notifCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {notifCount > 9 ? '9+' : notifCount}
            </span>
          )}
        </button>
      </div>

      {/* Mode toggle — visible only to users who are also workers */}
      {isWorker && (
        <div className="mt-4 px-6">
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

      {/* Active booking banner */}
      {hasActiveBooking && (
        <div className="mt-4 px-6">
          <button
            onClick={onActiveBookingClick}
            className="flex w-full items-center justify-between rounded-2xl bg-primary p-4 text-left shadow-md active:scale-95 transition-all"
          >
            <div>
              <p className="text-sm font-medium text-primary-foreground/80">Идэвхтэй захиалга</p>
              <p className="text-base font-bold text-primary-foreground">Цэвэрлэгээ — Ирж байна</p>
            </div>
            <ChevronRight className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
      )}

      {/* Promo banner */}
      <div className="mt-4 px-6">
        <div className="rounded-2xl bg-accent p-4 shadow-md">
          <p className="text-sm font-medium text-white/90">Шинэ хэрэглэгчдэд</p>
          <p className="text-lg font-bold text-white">Анхны захиалгадаа 20% хөнгөлөлт</p>
        </div>
      </div>

      {/* Categories */}
      <div className="mt-6 px-6">
        <h2 className="text-lg font-bold text-foreground">Үйлчилгээ сонгох</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {!serviceTypesData
            ? [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-sm">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            : categories.map((category) => {
                const Icon = ICON_MAP[category.icon] ?? Sparkles
                return (
                  <button
                    key={category.id}
                    onClick={() => onCreateOrder(category.id)}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 shadow-sm transition-all hover:shadow-md active:scale-95"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{category.name_mn}</span>
                  </button>
                )
              })}
        </div>
      </div>

      {/* Featured workers — display only (auto-match, no direct booking) */}
      <div className="mt-6">
        <div className="px-6">
          <h2 className="text-lg font-bold text-foreground">Шилдэг ажилтнууд</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Захиалга үүсгэхэд автоматаар хамгийн ойр ажилтантай холбоно
          </p>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto px-6 pb-2 scrollbar-hide min-h-[168px]">
          {isLoading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="flex min-w-[140px] flex-col items-center rounded-2xl bg-card p-4 shadow-sm">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <Skeleton className="mt-2 h-4 w-20" />
                  <Skeleton className="mt-1 h-3 w-16" />
                  <Skeleton className="mt-1 h-3 w-12" />
                </div>
              ))
            : (featuredWorkers ?? []).slice(0, 6).map((worker) => (
                <div
                  key={worker.id}
                  className="flex min-w-[140px] flex-col items-center rounded-2xl bg-card p-4 shadow-sm"
                >
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {worker.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-2 font-semibold text-foreground">{worker.name.split(' ')[0]}</p>
                  <p className="text-xs text-muted-foreground">{worker.specialty}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    <span className="text-xs font-medium text-foreground">{worker.rating}</span>
                    <span className="text-xs text-muted-foreground">({worker.reviewCount})</span>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  )
}
