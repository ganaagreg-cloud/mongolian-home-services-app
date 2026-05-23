'use client'

import { useState } from 'react'
import { ArrowLeft, Star, RotateCcw, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface OrdersScreenProps {
  onBack: () => void
  onRebook: (workerId: string) => void
}

type OrderStatus = 'active' | 'completed' | 'cancelled'

interface Order {
  id: string
  workerId: string
  workerName: string
  service: string
  date: string
  hours: number
  totalAmount: number
  rating?: number
  status: OrderStatus
}

const mockOrders: Order[] = [
  {
    id: '1',
    workerId: '1',
    workerName: 'Батболд Д.',
    service: 'Цэвэрлэгээ',
    date: '2026-05-20',
    hours: 3,
    totalAmount: 75000,
    rating: 5,
    status: 'completed',
  },
  {
    id: '2',
    workerId: '2',
    workerName: 'Сарантуяа Б.',
    service: 'Угаалга',
    date: '2026-05-15',
    hours: 2,
    totalAmount: 50000,
    rating: 4,
    status: 'completed',
  },
  {
    id: '3',
    workerId: '3',
    workerName: 'Анхбаяр Т.',
    service: 'Сантехник',
    date: '2026-05-10',
    hours: 1,
    totalAmount: 35000,
    status: 'cancelled',
  },
  {
    id: '4',
    workerId: '4',
    workerName: 'Энхтуяа Г.',
    service: 'Цэвэрлэгээ',
    date: '2026-05-23',
    hours: 2,
    totalAmount: 50000,
    status: 'active',
  },
]

const statusConfig: Record<OrderStatus, { label: string; icon: typeof Clock; bg: string; text: string }> = {
  active: { label: 'Идэвхтэй', icon: Clock, bg: 'bg-primary/10', text: 'text-primary' },
  completed: { label: 'Дууссан', icon: CheckCircle2, bg: 'bg-success/10', text: 'text-success' },
  cancelled: { label: 'Цуцлагдсан', icon: XCircle, bg: 'bg-destructive/10', text: 'text-destructive' },
}

export function OrdersScreen({ onBack, onRebook }: OrdersScreenProps) {
  const [tab, setTab] = useState<'active' | 'past'>('active')

  const filtered = mockOrders.filter((o) =>
    tab === 'active' ? o.status === 'active' : o.status !== 'active'
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
        {filtered.length === 0 ? (
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
          filtered.map((order) => {
            const cfg = statusConfig[order.status]
            const StatusIcon = cfg.icon
            return (
              <div key={order.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                      {order.workerName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-foreground">{order.workerName}</p>
                      <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
                        <StatusIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{order.service} · {order.hours}ц</p>
                    <p className="text-xs text-muted-foreground">{order.date}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div>
                    {order.rating != null && (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${s <= order.rating! ? 'fill-accent text-accent' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                    )}
                    <p className="mt-0.5 text-sm font-semibold text-primary">
                      ₮{order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  {order.status === 'completed' && (
                    <Button
                      onClick={() => onRebook(order.workerId)}
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-2xl border-border bg-card text-sm font-semibold shadow-sm active:scale-95 transition-all"
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" />
                      Дахин захиалах
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
