'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { ArrowLeft, RotateCcw, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetcher } from '@/lib/fetcher'
import type { Order, OrderStatus } from '@/lib/types'

interface OrdersScreenProps {
  onBack: () => void
  onRebook: (workerId: string) => void
  onViewActive: (orderId: string) => void
}

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'accepted', 'arriving', 'working']

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; bg: string; text: string }> = {
  pending:   { label: 'Хүлээгдэж байна', icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary' },
  accepted:  { label: 'Зөвшөөрсөн',     icon: Clock,        bg: 'bg-primary/10',     text: 'text-primary' },
  arriving:  { label: 'Ирж байна',       icon: Clock,        bg: 'bg-accent/10',      text: 'text-accent' },
  working:   { label: 'Ажиллаж байна',  icon: AlertCircle,  bg: 'bg-accent/10',      text: 'text-accent' },
  completed: { label: 'Дууссан',        icon: CheckCircle2, bg: 'bg-success/10',     text: 'text-success' },
  cancelled: { label: 'Цуцлагдсан',     icon: XCircle,      bg: 'bg-destructive/10', text: 'text-destructive' },
}

function OrderCard({ order, onRebook, onViewActive }: { order: Order; onRebook: (id: string) => void; onViewActive: (id: string) => void }) {
  const cfg = statusConfig[order.status]
  const StatusIcon = cfg.icon
  const isActive = ACTIVE_STATUSES.includes(order.status)
  const dateLabel = order.scheduledDate.split('T')[0]

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
            {(order.workerName ?? '?')[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-foreground">{order.workerName ?? '—'}</p>
            <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{order.service} · {order.hours}ц</p>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <p className="text-sm font-semibold text-primary">₮{order.totalAmount.toLocaleString()}</p>
        {isActive ? (
          <Button
            onClick={() => onViewActive(order.id)}
            size="sm"
            className="h-9 rounded-2xl bg-primary text-sm font-semibold shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          >
            Харах
          </Button>
        ) : order.status === 'completed' ? (
          <Button
            onClick={() => onRebook(order.workerId)}
            size="sm"
            variant="outline"
            className="h-9 rounded-2xl border-border bg-card text-sm font-semibold shadow-sm active:scale-95 transition-all"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Дахин захиалах
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function OrdersScreen({ onBack, onRebook, onViewActive }: OrdersScreenProps) {
  const [tab, setTab] = useState<'active' | 'past'>('active')
  const { data: orders, isLoading, error } = useSWR<Order[]>('/api/orders', fetcher)

  const filtered = (orders ?? []).filter((o) =>
    tab === 'active' ? ACTIVE_STATUSES.includes(o.status) : !ACTIVE_STATUSES.includes(o.status)
  )

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
        <h1 className="text-xl font-bold text-foreground">Захиалгын түүх</h1>
      </div>

      {/* Tabs */}
      <div className="mt-6 px-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'past')}>
          <TabsList className="w-full rounded-2xl bg-card p-1 h-12">
            <TabsTrigger
              value="active"
              className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Идэвхтэй
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="flex-1 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Өнгөрсөн
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Order List */}
      <div className="mt-4 space-y-3 px-6">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm text-destructive">Захиалга ачаалахад алдаа гарлаа</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-semibold text-foreground">Захиалга байхгүй</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === 'active' ? 'Одоогоор идэвхтэй захиалга алга' : 'Өнгөрсөн захиалга байхгүй байна'}
            </p>
          </div>
        ) : (
          filtered.map((order) => (
            <OrderCard key={order.id} order={order} onRebook={onRebook} onViewActive={onViewActive} />
          ))
        )}
      </div>
    </div>
  )
}
